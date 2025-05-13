let monsterData = null;
let skillsData = null;
let SPDBoostConstant = 0.3;
let kroaBoostTarget = 2;
let lionelPosition = null;

function checkForMiriam() {
    const monsterCards = Array.from(document.querySelectorAll('.monster'));
    const hasMiriam = monsterCards.some(card => {
        const monsterId = card.querySelector('select').id;
        const monster = getMonsterDetails(document.getElementById(monsterId).value);
        return monster && monster.name === "Miriam";
    });
    
    SPDBoostConstant = hasMiriam ? 0.405 : 0.3;
}

function fetchSkills() {
    fetch('./skills.json')
        .then(response => response.json())
        .then(data => {
            skillsData = data;
        });
}

function getMonsterDetails(monsterValue, is2A = false) {
    const [name, element] = monsterValue.split('|');
    
    if (is2A) {
        return monsterData.find(m => m.name === name && m.element === element && m.awaken_level === 2);
    }
    return monsterData.find(m => m.name === name && m.element === element && m.awaken_level !== 2);
}

function populateDropdowns(monsters) {
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        select.innerHTML = '<option value="">Select Monster</option>';
        
        // Count non-2A monsters with same name
        const nameCount = {};
        monsters.forEach(m => {
            if (m.awaken_level !== 2) {
                nameCount[m.name] = (nameCount[m.name] || 0) + 1;
            }
        });
        
        const sortedMonsters = monsters
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(monster => ({
                ...monster,
                displayName: monster.awaken_level === 2 ? `${monster.name} (2A)`
                    : nameCount[monster.name] > 1 ? `${monster.name} (${monster.element})`
                        : monster.name,
                value: `${monster.name}|${monster.element}`
            }));
        
        sortedMonsters.forEach(monster => {
            const option = document.createElement('option');
            option.value = monster.value;
            option.textContent = monster.displayName;
            select.appendChild(option);
        });
    });
}

function fetchAndPopulateMonsters() {
    fetch('monsters.json')
        .then(response => response.json())
        .then(monsters => {
            // Filter monsters to only include those with obtainable set to true
            const filteredMonsters = monsters.filter(monster => 
    monster.obtainable === true && 
    monster.archetype !== "Material"
);

            
            console.log(`Using ${filteredMonsters.length} obtainable monsters from total ${monsters.length}`);
            
            // Store the filtered monsters in the global variable
            window.monsterData = filteredMonsters;
            
            // Populate dropdowns with the filtered monsters
            populateDropdowns(filteredMonsters);
        })
        .catch(error => {
            console.error('Error fetching monsters:', error);
        });
}

function updateMonster(id) {
    checkForMiriam();
    const select = document.getElementById(id);
    const selectedValue = select.value;
    const is2A = select.options[select.selectedIndex].text.includes('(2A)');
    const cleanName = selectedValue;
    const selectedMonster = getMonsterDetails(cleanName, is2A);
    const position = parseInt(id.replace('friendly', ''));
    
    if (!selectedMonster) return; // Exit if no monster is selected
    
    // Get the current monster card
    const monsterCard = select.closest('.monster');
    
    // Get the special abilities div
    const specialAbilitiesDiv = monsterCard.querySelector('.monster-special-abilities');
    if (!specialAbilitiesDiv) {
        console.error('Special abilities div not found');
        return;
    }
    
    // Find or create Kroa boost target div for this specific monster card
    let kroaTargetDiv = monsterCard.querySelector('.kroa-boost-target');
    if (!kroaTargetDiv) {
        // Create the div if it doesn't exist
        kroaTargetDiv = document.createElement('div');
        kroaTargetDiv.className = 'kroa-boost-target';
        kroaTargetDiv.style.display = 'none';
        kroaTargetDiv.innerHTML = `
            <p>ATB Boost Target:</p>
            <label>
                <input type="radio" name="kroa-target-${id}" value="2" checked>
                Monster 2
            </label>
            <label>
                <input type="radio" name="kroa-target-${id}" value="3">
                Monster 3
            </label>
        `;
        // Add it to the monster's special abilities section
        specialAbilitiesDiv.appendChild(kroaTargetDiv);
    }
    
    // Show/hide Kroa boost target div based on whether this monster is Kroa
    if (selectedMonster.name === 'Kroa' || selectedMonster.name === 'Ramael and Judiah' || selectedMonster.name === 'Yeji and Sapsaree') {
        kroaTargetDiv.style.display = 'block';
        
        // Add event listeners to the radio buttons
        kroaTargetDiv.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                kroaBoostTarget = parseInt(e.target.value);
                recalculateTeamSpeeds();
                updateSpeedDisplayText();
            });
        });
    } else {
        kroaTargetDiv.style.display = 'none';
    }
    
    // Remove any existing Kahli skill selection
    const existingKahliSkill = monsterCard.querySelector('.kahli-skill-selection');
    if (existingKahliSkill) {
        existingKahliSkill.remove();
    }
    
    // Add Kahli skill selection if this is Kahli
    if (selectedMonster.name === 'Kahli') {
        const kahliSkillDiv = document.createElement('div');
        kahliSkillDiv.className = 'kahli-skill-selection';
        kahliSkillDiv.style.marginBottom = '10px';
        kahliSkillDiv.innerHTML = `
            <p>Skill Used:</p>
            <label>
                <input type="radio" name="kahli-skill-${id}" value="2" checked>
                Skill 2 (No Buff)
            </label>
            <p></p>
            <label>
                <input type="radio" name="kahli-skill-${id}" value="3">
                Skill 3 (Speed Buff)
            </label>
            <div class="tooltip-container">
                <span class="tooltip-icon" onclick="toggleTooltip(event)">?</span>
                <span class="tooltip-text">Select which skill Kahli will use. Skill 3 applies a speed buff to subsequent monsters.</span>
            </div>
        `;
        
        // Insert at the beginning of the special abilities div
        if (specialAbilitiesDiv.firstChild) {
            specialAbilitiesDiv.insertBefore(kahliSkillDiv, specialAbilitiesDiv.firstChild);
        } else {
            specialAbilitiesDiv.appendChild(kahliSkillDiv);
        }
        
        // Add event listeners to the radio buttons
        kahliSkillDiv.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', () => {
                recalculateTeamSpeeds();
                updateSpeedDisplayText();
            });
        });
    }
    
    // Remove any existing Chilling explanation text
    const existingExplanation = monsterCard.querySelector('.chilling-explanation');
    if (existingExplanation) {
        existingExplanation.remove();
    }
    
    // Add Chilling explanation text if this is Chilling AND in slot 1
    if (selectedMonster.name === 'Chilling' && position === 1) {
        const combatSpeedElement = monsterCard.querySelector('.combat-speed');
        const chillingExplanation = document.createElement('p');
        chillingExplanation.className = 'chilling-explanation';
        chillingExplanation.textContent = 'Speed calculated with both Will and Shield buffs';
        
        // Insert after the combat speed element
        combatSpeedElement.after(chillingExplanation);
    }
    
    // Track Lionel's position
    if (selectedMonster.name === 'Lionel') {
        lionelPosition = parseInt(id.replace('friendly', ''));
    } else if (lionelPosition && id === `friendly${lionelPosition}`) {
        lionelPosition = null;
    }
    
    // Update name and speed
    document.getElementById(`${id}-name`).textContent = selectedMonster.name;
    document.getElementById(`${id}-speed`).textContent = selectedMonster.speed;
    
    // Set monster image based on awakening status
    if (selectedMonster.image_filename) {
        const monsterImage = document.getElementById(`${id}-image`);
        monsterImage.src = `./icons/${selectedMonster.image_filename}`;
    }

    // Handle speed leader skill
    const speedLeadContainer = document.getElementById(`${id}-speedlead-container`);
    const speedLeadValue = document.getElementById(`${id}-speedlead-value`);
    
    if (selectedMonster.leader_skill && selectedMonster.leader_skill.attribute === "Attack Speed") {
        speedLeadContainer.style.display = 'block';
        speedLeadValue.textContent = selectedMonster.leader_skill.amount;
    } else {
        speedLeadContainer.style.display = 'none';
    }
    
    // Check for ATB boost skills - UPDATED WITH YEONHONG EXCEPTION
    const isYeonhong = selectedMonster.name === "Yeonhong";
    const isCraig = selectedMonster.name === "Craig";
    const isMBisonLight = selectedMonster.name === "M. Bison" && selectedMonster.element === "Light";
    const hasAtbBoost = checkForAtbBoost(selectedMonster.skills, isYeonhong);
    const atbBoostContainer = document.getElementById(`${id}-atb-boost-container`);
    const atbBoostInput = document.getElementById(`${id}-atb-boost`);

    if (hasAtbBoost || isCraig || isMBisonLight) {
        // Get the ATB boost value and set it in the input
        let atbBoostValue = 0;

        if (isCraig || isMBisonLight) {
            // Set Craig's and M. Bison (Light)'s default ATB boost to 40
            atbBoostValue = 40;
        } else {
            atbBoostValue = getAtbBoostValue(selectedMonster.skills, isYeonhong);
        }

        atbBoostInput.value = atbBoostValue;
        atbBoostContainer.style.display = 'block';
    } else {
        atbBoostInput.value = 0;
        atbBoostContainer.style.display = 'none';
    }
    
    // Handle speed buff for artifacts
    if (id === 'friendly1') {
        const hasSpeedBuff = selectedMonster.skills.some(skillId => {
            const skill = skillsData.find(s => s.id === skillId);
            return skill && skill.effects.some(effect => effect.effect.id === 5);
        });
        
        // Get all artifact speed inputs and containers
        const artifactInputs = document.querySelectorAll('.artifact-speed input');
        const artifactContainers = document.querySelectorAll('.artifact-speed');

        if (hasSpeedBuff) {
            artifactContainers.forEach(container => {
                container.style.display = 'block';
            });
        } else {
            artifactContainers.forEach(container => {
                container.style.display = 'none';
            });
            artifactInputs.forEach(input => {
                input.value = 0;
            });
        }
    }
    
    // Recalculate and update display
    recalculateTeamSpeeds();
    updateSpeedDisplayText();
}



function getAtbBoostValue(skillIds, isYeonhong = false) {
    if (!skillsData) return 0;
    
    for (const skillId of skillIds) {
        const skill = skillsData.find(s => s.id === skillId);
        if (!skill || !skill.effects) continue;
        
        for (const effect of skill.effects) {
            const isAtbBoost = (effect.effect.id === 17 || effect.effect.name === "Increase ATB");
            
            // For Yeonhong, include the ATB boost even if it's self-only
            if (isYeonhong && isAtbBoost && effect.quantity) {
                return effect.quantity;
            }
            
            // For other monsters, only include if it's not self-only
            if (isAtbBoost && !effect.self_effect && effect.quantity) {
                return effect.quantity;
            }
        }
    }
    
    return 0;
}





function checkForAtbBoost(skillIds, isYeonhong = false) {
    return skillIds.some(skillId => {
        const skill = skillsData.find(s => s.id === skillId);
        if (!skill || !skill.effects) return false;
        
        return skill.effects.some(effect => {
            // Check if it's an ATB boost effect
            const isAtbBoost = (effect.effect.id === 17 || effect.effect.name === "Increase ATB");
            
            // For Yeonhong, include the ATB boost even if it's self-only
            if (isYeonhong && isAtbBoost) return true;
            
            // For other monsters, only include if it's not self-only
            return isAtbBoost && !effect.self_effect;
        });
    });
}


function getSkillDetails(skillIds) {
    return skillIds.map(skillId => {
        return skillsData.find(s => s.id === skillId);
    });
}

function updateAtbBoost(monsterId) {
    const atbBoostInput = document.getElementById(`${monsterId}-atb-boost`);
    const atbBoostValue = parseInt(atbBoostInput.value);

    if (isNaN(atbBoostValue) || atbBoostValue < 0) {
        atbBoostInput.value = 0;
    } else if (atbBoostValue > 100) {
        atbBoostInput.value = 100;
    }

    console.log(`Monster ${monsterId} ATB Boost set to ${atbBoostInput.value}%`);
    //calculateTurnOrder();
    recalculateTeamSpeeds();
    updateSpeedDisplayText();
    //checkSpeedOrder();
}

function updateSpeedLead(monsterId) {
    const speedLeadCheckbox = document.getElementById(`${monsterId}-speedlead`);
    const isSpeedLead = speedLeadCheckbox.checked;
    const selectedMonster = getMonsterDetails(monsterId);
    const speedLeadValue = document.getElementById(`${monsterId}-speedlead-value`).textContent;
    if (isSpeedLead) {
    ['friendly1', 'friendly2', 'friendly3'].forEach(id => {
        if (id !== monsterId) {
            const otherSpeedLead = document.getElementById(`${id}-speedlead`);
            if (otherSpeedLead) otherSpeedLead.checked = false;
        }
    });
}
    console.log(`Monster ${monsterId} Speed Lead (${speedLeadValue}%) set to ${isSpeedLead}`);
        ['friendly1', 'friendly2', 'friendly3'].forEach(id => {
        recalculateTeamSpeeds();
        updateSpeedDisplayText();
    });
    //calculateTurnOrder();
    
    //checkSpeedOrder();
    // You can add more logic here if needed
}

function updateRuneSpeed(monsterId) {
    const runeSpeedInput = document.getElementById(`${monsterId}-rune-speed`);
    const runeSpeedValue = parseInt(runeSpeedInput.value);

    if (isNaN(runeSpeedValue) || runeSpeedValue < 0) {
        runeSpeedInput.value = 0;
    } else if (runeSpeedValue > 1000) {
        runeSpeedInput.value = 1000;
    }
    //calculateTurnOrder();
    recalculateTeamSpeeds();
    updateSpeedDisplayText();
    //checkSpeedOrder();
}

function initializeTurnOrderListeners() {
const turnOrderCheckboxes = document.querySelectorAll('.turn-order input[type="checkbox"]');
turnOrderCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function() {
        const monsterDiv = this.closest('.monster');
        const monsterId = monsterDiv.querySelector('select').id;
        const turnOrder = this.value;
        const isChecked = this.checked;

        // Uncheck all other checkboxes in the same monster div
        if (isChecked) {
            monsterDiv.querySelectorAll('.turn-order input[type="checkbox"]').forEach(cb => {
                if (cb !== this) {
                    cb.checked = false;
                }
            });
        }

        console.log(`Monster ${monsterId} turn order set to ${isChecked ? turnOrder : 'none'}`);

        // You can add more logic here if needed
        });
    });
}

function updateSwift(monsterId) {
    const swiftCheckbox = document.getElementById(`${monsterId}-swift`);
    const isSwift = swiftCheckbox.checked;
    console.log(`Monster ${monsterId} Swift set to ${isSwift}`);
    //calculateTurnOrder();
    recalculateTeamSpeeds();
    updateSpeedDisplayText();
    //checkSpeedOrder();
    // You can add more logic here if needed
}

function updateArtifactSpeed(monsterId) {
    const artifactSpeedInput = document.getElementById(`${monsterId}-artifact-speed`);
    const artifactSpeedValue = parseFloat(artifactSpeedInput.value);

    if (isNaN(artifactSpeedValue) || artifactSpeedValue < 0) {
        artifactSpeedInput.value = 0;
    } else if (artifactSpeedValue > 1000) {
        artifactSpeedInput.value = 1000;
    }
    //calculateTurnOrder();
    //calculateCombatSpeed(monsterId);
    recalculateTeamSpeeds();
    updateSpeedDisplayText();
    //checkSpeedOrder();
    // You can add more logic here if needed, such as recalculating total speed
}

function getSpeedLead(team) {
    const speedLeads = team.map(id => {
        const select = document.getElementById(id);
        if (!select) return 0;
        if (!select.value) return 0;
        
        const selectedMonster = getMonsterDetails(select.value);
        const speedLeadCheckbox = document.getElementById(`${id}-speedlead`);
        return (selectedMonster && selectedMonster.leader_skill && speedLeadCheckbox.checked) ? selectedMonster.leader_skill.amount : 0;
    });
    return Math.max(...speedLeads);
}

/*function initializeDraggableCards() {
    const cards = document.querySelectorAll('.monster');
    
    cards.forEach(card => {
        let newX = 0, newY = 0, startX = 0, startY = 0;
        let initialLeft, initialTop;
        
        card.style.position = 'relative';
        
        card.addEventListener('mousedown', mouseDown);
        
        function mouseDown(e) {
            // Only start dragging if we're not clicking an interactive element
            if (e.target.tagName === 'SELECT' || 
                e.target.tagName === 'INPUT' || 
                e.target.tagName === 'LABEL' ||
                e.target.tagName === 'BUTTON'||
               e.target.classList.contains('tooltip-icon')) {
                return;
            }
            
            e.preventDefault();
            startX = e.clientX;
            startY = e.clientY;
            
            initialLeft = parseInt(card.style.left) || 0;
            initialTop = parseInt(card.style.top) || 0;
            
            document.addEventListener('mousemove', mouseMove);
            document.addEventListener('mouseup', mouseUp);
        }
        
        function mouseMove(e) {
            const dx = e.clientX - startX;
            // Lock Y movement by not applying dy
            
            card.style.left = initialLeft + dx + 'px';
            card.style.zIndex = '1000';
        }
        
        function mouseUp() {
            document.removeEventListener('mousemove', mouseMove);
            document.removeEventListener('mouseup', mouseUp);
            
            // Get all cards in the same row
            const row = card.parentElement;
            const cardsInRow = Array.from(row.querySelectorAll('.monster'));
            
            // Sort cards based on their current X position
            cardsInRow.sort((a, b) => {
                return a.getBoundingClientRect().left - b.getBoundingClientRect().left;
            });
            
            // Store the current values before reordering
            const monsterData = cardsInRow.map(c => {
                const selectElement = c.querySelector('select');
                const id = selectElement.id;
                
                return {
                    id: id,
                    value: selectElement.value,
                    runeSpeed: document.getElementById(`${id}-rune-speed`)?.value || 0,
                    artifactSpeed: document.getElementById(`${id}-artifact-speed`)?.value || 0,
                    isSwift: document.getElementById(`${id}-swift`)?.checked || false,
                    atbBoost: document.getElementById(`${id}-atb-boost`)?.value || 0,
                    isSpeedLead: document.getElementById(`${id}-speedlead`)?.checked || false
                };
            });
            
            // Reset positions and reorder
            cardsInRow.forEach((c, index) => {
                c.style.left = '0px';
                c.style.zIndex = '1';
                row.appendChild(c);
            });
            
            // Update IDs to match new positions
            const newOrderCards = Array.from(row.querySelectorAll('.monster'));
            newOrderCards.forEach((card, index) => {
                const newPosition = index + 1;
                
                // Update all element IDs within this card
                card.querySelectorAll('[id]').forEach(element => {
                    const currentId = element.id;
                    const match = currentId.match(/^(friendly\d+)(.*)$/);
                    
                    if (match) {
                        const suffix = match[2]; // e.g., "-rune-speed"
                        element.id = `friendly${newPosition}${suffix}`;
                    }
                });
            });
            
            // First update all monsters to ensure ATB boost containers are properly displayed
            monsterData.forEach((data, index) => {
                const newId = `friendly${index + 1}`;
                document.getElementById(newId).value = data.value;
                document.getElementById(`${newId}-rune-speed`).value = data.runeSpeed;
                document.getElementById(`${newId}-artifact-speed`).value = data.artifactSpeed;
                document.getElementById(`${newId}-swift`).checked = data.isSwift;
                
                // Update the monster with its new position (this will show/hide ATB boost containers)
                updateMonster(newId);
            });
            
            // Now set ATB boost and speed lead values AFTER monsters are updated
            // This ensures the containers are visible before we try to set values
            monsterData.forEach((data, index) => {
                const newId = `friendly${index + 1}`;
                
                // Set ATB boost value if the element exists
                const atbBoostElement = document.getElementById(`${newId}-atb-boost`);
                if (atbBoostElement && data.atbBoost) {
                    atbBoostElement.value = data.atbBoost;
                    // Manually trigger the ATB boost update
                    updateAtbBoost(newId);
                }
                
                // Set speed lead value if the element exists
                const speedLeadElement = document.getElementById(`${newId}-speedlead`);
                if (speedLeadElement) {
                    speedLeadElement.checked = data.isSpeedLead;
                    // Manually trigger the speed lead update
                    updateSpeedLead(newId);
                }
            });
            
            // Recalculate everything
            recalculateTeamSpeeds();
            updateSpeedDisplayText();
        }
    });
    recalculateTeamSpeeds();
    updateSpeedDisplayText();
}*/

function initializeDraggableCards() {
    const row = document.querySelector('.team.friendly');
    const cards = row.querySelectorAll('.monster');

    cards.forEach(card => {
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;
        let placeholder = null;

        card.addEventListener('mousedown', function(e) {
            if (e.target.tagName === 'SELECT' || 
                e.target.tagName === 'INPUT' || 
                e.target.tagName === 'LABEL' ||
                e.target.tagName === 'BUTTON' ||
                e.target.classList.contains('tooltip-icon') ||
                e.target.closest('select, input, label, button, .tooltip-icon')) {
                return;
            }

            e.preventDefault();
            isDragging = true;

            // Get the card's bounding box relative to the page
            const cardRect = card.getBoundingClientRect();
            offsetX = e.pageX - cardRect.left;
            offsetY = e.pageY - cardRect.top;

            // Create a placeholder
            placeholder = document.createElement('div');
            placeholder.className = 'monster placeholder';
            placeholder.style.width = `${card.offsetWidth}px`;
            placeholder.style.height = `${card.offsetHeight}px`;
            placeholder.style.border = '2px dashed #666';
            placeholder.style.boxSizing = 'border-box';
            row.insertBefore(placeholder, card.nextSibling);

            // Prepare card for dragging
            card.style.position = 'absolute';
            card.style.width = `${card.offsetWidth}px`;
            card.style.height = `${card.offsetHeight}px`;
            card.style.zIndex = '1000';
            card.style.pointerEvents = 'none';
            card.classList.add('dragging');

            moveAt(e.pageX, e.pageY);

            document.addEventListener('mousemove', mouseMove);
            document.addEventListener('mouseup', mouseUp);
        });

        function moveAt(pageX, pageY) {
            card.style.left = `${pageX - offsetX - row.getBoundingClientRect().left}px`;
            card.style.top = `${pageY - offsetY - row.getBoundingClientRect().top}px`;
        }

        function mouseMove(e) {
            if (!isDragging) return;

            moveAt(e.pageX, e.pageY);

            const cardsArray = Array.from(row.querySelectorAll('.monster:not(.dragging):not(.placeholder)'));
            let inserted = false;

            for (const otherCard of cardsArray) {
                const rect = otherCard.getBoundingClientRect();
                const middle = rect.left + rect.width / 2;

                if (e.clientX < middle) {
                    row.insertBefore(placeholder, otherCard);
                    inserted = true;
                    break;
                }
            }

            if (!inserted) {
                row.appendChild(placeholder);
            }
        }


        function mouseUp() {
            if (!isDragging) return;
            isDragging = false;

            document.removeEventListener('mousemove', mouseMove);
            document.removeEventListener('mouseup', mouseUp);

            // Reset card styles
            card.style.position = '';
            card.style.left = '';
            card.style.top = '';
            card.style.width = '';
            card.style.height = '';
            card.style.zIndex = '';
            card.style.pointerEvents = '';
            card.classList.remove('dragging');

            // Insert card in placeholder position
            row.insertBefore(card, placeholder);
            placeholder.remove();
            placeholder = null;

            recalculateTeamSpeeds();
            updateSpeedDisplayText();
        }
    });
}













// Helper function to update all element IDs within a monster card
function updateElementIds(card, newPosition) {
    // Get all elements with IDs within this card
    const elementsWithIds = card.querySelectorAll('[id]');
    
    elementsWithIds.forEach(element => {
        const currentId = element.id;
        // Extract the base ID (e.g., "friendly1" from "friendly1-rune-speed")
        const match = currentId.match(/^(friendly\d+)(.*)$/);
        
        if (match) {
            const suffix = match[2]; // e.g., "-rune-speed"
            const newId = `friendly${newPosition}${suffix}`;
            element.id = newId;
            
            // Also update any for attributes in labels
            if (element.tagName === 'INPUT') {
                const label = card.querySelector(`label[for="${currentId}"]`);
                if (label) {
                    label.setAttribute('for', newId);
                }
            }
        }
    });
}


function updateSpeedDisplayText() {
    const monsterCards = Array.from(document.querySelectorAll('.monster'));
    
    monsterCards.forEach((card, index) => {
        const runeSpeedDiv = card.querySelector('.rune-speed');
        const speedElement = card.querySelector('.combat-speed');
        const currentSpeed = speedElement.textContent.split(': ')[1];
        
        if (index === 0) {
            runeSpeedDiv.style.display = 'block';
            speedElement.textContent = `Combat Speed: ${currentSpeed}`;
        } else {
            runeSpeedDiv.style.display = 'none';
            speedElement.textContent = `Speed Needed: ${currentSpeed}`;
        }
    });
}

function toggleTooltip(event) {
    console.log('Tooltip icon clicked');
    const tooltip = event.target.nextElementSibling;
    console.log('Tooltip element:', tooltip);
    tooltip.classList.toggle('show');
    console.log('Show class toggled');
}

function hideAllTooltips() {
    const tooltips = document.querySelectorAll('.tooltip-text');
    tooltips.forEach(tooltip => tooltip.classList.remove('show'));
}

document.addEventListener('click', (event) => {
    if (!event.target.classList.contains('tooltip-icon')) {
        hideAllTooltips();
    }
});

function getAccumulatedAtbBoost(currentIndex, targetPosition = null) {
    let totalBoost = 0;
    for(let i = 0; i <= currentIndex; i++) {
        const monsterBoost = parseFloat(document.getElementById(`friendly${i+1}-atb-boost`).value) || 0;
        
        // Skip Lionel's boost unless the target is directly after Lionel
        if (lionelPosition === i+1) {
            const targetMonsterPosition = targetPosition || currentIndex + 1;
            if (targetMonsterPosition !== lionelPosition + 1) {
                continue; // Skip Lionel's boost
            }
        }
        
        if(monsterBoost > 0) {
            totalBoost += monsterBoost;
        }
    }
    return totalBoost;
}

function getEffectsByPosition() {
    const effects = [];
    const monsterCards = Array.from(document.querySelectorAll('.monster'));
    
    monsterCards.forEach((card, index) => {
        const monsterId = card.querySelector('select').id;
        const monsterSelect = document.getElementById(monsterId);
        const isMonster2A = monsterSelect.options[monsterSelect.selectedIndex].text.includes('(2A)');
        const monster = getMonsterDetails(monsterSelect.value, isMonster2A);
        
        if (!monster) {
            effects.push({
                position: index,
                hasSpeedBuff: false,
                atbBoost: 0
            });
            return;
        }
        
        let hasSpeedBuff = false;
        
        // Special case for Kahli
        if (monster.name === 'Kahli') {
            // Check which skill is selected
            const kahliSkillRadios = card.querySelectorAll('input[name^="kahli-skill-"]');
            const selectedSkill = Array.from(kahliSkillRadios).find(radio => radio.checked)?.value;
            
            // Only apply speed buff if Skill 3 is selected
            hasSpeedBuff = selectedSkill === '3';
        } else {
            // Normal case for other monsters
            hasSpeedBuff = monster.skills.some(skillId => {
                const skill = skillsData.find(s => s.id === skillId);
                return skill && skill.effects.some(effect => effect.effect.id === 5);
            });
        }
        
        const atbBoost = parseFloat(document.getElementById(`${monsterId}-atb-boost`).value) || 0;
        
        effects.push({
            position: index,
            hasSpeedBuff,
            atbBoost
        });
    });
    
    return effects;
}


function calculateTunedSpeed(leadSkill, baseBooster, runeSpeedBooster, tickConstant, iteration, atbBoostSum, artiSpeedSum, baseSpeed, isSwift = true, applyModifier = true, isChilling = false) {
    console.log(``);
    console.log(`leadSkill: ${leadSkill}`);
    console.log(`baseBooster: ${baseBooster}`);
    console.log(`runeSpeedBooster: ${runeSpeedBooster}`);
    console.log(`tickConstant: ${tickConstant}`);
    console.log(`iteration: ${iteration}`);
    console.log(`atbBoostSum: ${atbBoostSum}`);
    console.log(`artiSpeedSum: ${artiSpeedSum}`);
    console.log(`baseSpeed: ${baseSpeed}`);
    console.log(`isSwift: ${isSwift}`);
    console.log(`applyModifier: ${applyModifier}`);
    const speedModifier = 1 + SPDBoostConstant * (1 + artiSpeedSum / 100);
    let atbPerTick = Math.ceil((1.15 + leadSkill / 100) * baseBooster + runeSpeedBooster);
    if (isChilling)
        {
            console.log(`Chilling loop adding 40 to cmb speed.`);
            atbPerTick = atbPerTick + 40;
        }
    console.log(`Booster Combat Speed: ${atbPerTick}`);
    const numerator = atbPerTick * tickConstant * (Math.ceil(1/(atbPerTick * tickConstant)) + iteration) - atbBoostSum/100;
    console.log(`Numerator: ${numerator}`);
    const denominator = tickConstant * (Math.ceil(1/(atbPerTick * tickConstant)) + iteration * (applyModifier ? speedModifier : 1));
    console.log(`Denominator: ${denominator}`);
    const result = numerator / denominator;
    let speedResult = Math.floor(result) - baseSpeed * (1.15 + leadSkill / 100);
    let swiftAdjustment = false;
    if (isSwift)
    {
        let swiftnum = speedResult % 1;
        let nonswiftnum = (baseSpeed % 4) / 4;
        console.log(`SwiftNum: ${swiftnum}`);
        console.log(`nonswiftNum: ${nonswiftnum}`);
        if (swiftnum > nonswiftnum)
            {
                swiftAdjustment = true;
            }
    }
    if (swiftAdjustment)
        {
            return Math.ceil(Math.floor((numerator / denominator)) + 0.0001 - baseSpeed * (1.15 + leadSkill / 100) + 1);
        }
    else{
        return Math.ceil(Math.floor((numerator / denominator)) + 0.0001 - baseSpeed * (1.15 + leadSkill / 100));
    }
}

function recalculateTeamSpeeds() {
    checkForMiriam();
    const monsterCards = Array.from(document.querySelectorAll('.monster'));
    const teamSpeedLead = getSpeedLead(['friendly1', 'friendly2', 'friendly3']);
    
    // Get booster's stats
    const boosterCard = monsterCards[0];
    const boosterId = boosterCard.querySelector('select').id;
    const boosterSelect = document.getElementById(boosterId);
    const isBooster2A = boosterSelect.options[boosterSelect.selectedIndex].text.includes('(2A)');
    const boosterMonster = getMonsterDetails(boosterSelect.value, isBooster2A);
    let boosterBaseSpeed = boosterMonster ? boosterMonster.speed : 0;
    const boosterRuneSpeed = parseInt(document.getElementById(`${boosterId}-rune-speed`).value) || 0;
    const boosterAtbBoost = parseFloat(document.getElementById(`${boosterId}-atb-boost`).value) || 0;
    let isKroa = false;
    let isChilling = false;
    const speedLeadPosition = getSpeedLeadPosition();
    
    // Simple booster speed calculation
    let boosterCombatSpeed = Math.ceil((1.15 + teamSpeedLead/100) * boosterBaseSpeed + boosterRuneSpeed);
    if (boosterMonster.name === "Chilling") {
        boosterCombatSpeed = boosterCombatSpeed + 40;
        isChilling = true;
    }
    if (boosterMonster.name === "Kroa") {
        isKroa = true;
    }
    boosterCard.querySelector('.combat-speed').textContent = `Combat Speed: ${boosterCombatSpeed}`;
    
    const boosterEffects = getBoosterEffectTypes(boosterId);
    let applyModifier = false;
    if (boosterEffects.includes(5)){
        applyModifier = true;
    }
    else{
        applyModifier = false;
    }
    
    // Calculate tuned speeds for followers using booster's ATB boost
    monster2tunedspeed = null;
    monster3tunedspeed = null;
    monster2combatspeed = null;
    monster3combatspeed = null;
    monster2tfnumber = null;
    monster3tfnumber = null;
    monster2basespeed = null;
    mon2efftick = null;
    
    // Get effects by position using the existing function
    const effectsByPosition = getEffectsByPosition();
    
    monsterCards.slice(1).forEach((card, index) => {
        const monsterId = card.querySelector('select').id;
        const monsterSelect = document.getElementById(monsterId);
        const isMonster2A = monsterSelect.options[monsterSelect.selectedIndex].text.includes('(2A)');
        const monster = getMonsterDetails(monsterSelect.value, isMonster2A);
        if (!monster) return;
        
        const artiSpeed = parseFloat(document.getElementById(`${monsterId}-artifact-speed`).value) || 0;
        const currentPosition = index + 1;
        const thisMonsterPosition = parseInt(monsterId.replace('friendly', ''));
        let accumulatedAtbBoost = getAccumulatedAtbBoost(index, thisMonsterPosition);
        
        // Determine if speed buff is active for this monster
        let speedBuffActive = false;
        
        // If Monster 1 has speed buff, it applies to all
        if (applyModifier) {
            speedBuffActive = true;
        } else {
            // Check if any monster before this one has a speed buff
            // For Monster 2 (index 0), only Monster 1's buff would apply
            // For Monster 3 (index 1), both Monster 1 and 2's buffs could apply
            for (let i = 0; i < currentPosition; i++) {
                if (effectsByPosition[i] && effectsByPosition[i].hasSpeedBuff) {
                    speedBuffActive = true;
                    break;
                }
            }
        }
        
        const isSwift = document.getElementById(`${monsterId}-swift`).checked;
        
        if (isKroa) {
            console.log(``);
            console.log(`Monster: ${monster.name}`);
            accumulatedAtbBoost = (currentPosition === kroaBoostTarget - 1) ? accumulatedAtbBoost : 0;
            let tunedSpeed = calculateTunedSpeed(
                teamSpeedLead,
                boosterBaseSpeed,
                boosterRuneSpeed,
                0.0007,
                index + 1,
                accumulatedAtbBoost,
                artiSpeed,
                monster.speed,
                isSwift,
                speedBuffActive,
                isChilling
            );
            card.querySelector('.combat-speed').textContent = `Speed Needed: ${tunedSpeed}`;
        } else {
            let tunedSpeed = calculateTunedSpeed(
                teamSpeedLead,
                boosterBaseSpeed,
                boosterRuneSpeed,
                0.0007,
                index + 1,
                accumulatedAtbBoost,
                artiSpeed,
                monster.speed,
                isSwift,
                speedBuffActive,
                isChilling
            );
            
            // Rest of the existing code for Monster 2 and 3 calculations...
            if (index == 0) {
                // Calculating Monster 2's speed
                console.log(`Monster: ${monster.name}`);
                monster2tunedspeed = tunedSpeed;
                monster2rawspeed = (1.15 + teamSpeedLead/100) * monster.speed;
                monster2combatspeed = Math.ceil(monster2tunedspeed + monster2rawspeed);
                boosterTick = Math.ceil(1 / (boosterCombatSpeed * 0.0007));
                mon2efftick = boosterTick + ((index + 1) * (1 + SPDBoostConstant * (1 + (artiSpeed / 100))));
                monster2tfnumber = ((boosterTick + ((index + 1) * (1 + SPDBoostConstant * (1 + (artiSpeed / 100))))) * monster2combatspeed);
                monster2basespeed = monster.speed;
                if (speedLeadPosition && 2 < speedLeadPosition) {
                    monster2tunedspeed += 1;
                }
            }
            if (index === 1) {
                // Existing Monster 3 calculations...
                console.log(`Monster: ${monster.name}`);
                monster3tunedspeed = tunedSpeed;
                monster3rawspeed = (1.15 + teamSpeedLead/100) * monster.speed;
                monster3combatspeed = Math.ceil(monster3tunedspeed + monster3rawspeed);
                console.log(``);
                console.log(`monster3combatspeed: ${monster3combatspeed}`);
                console.log(`monster2combatspeed: ${monster2combatspeed}`);
                console.log(`mon2efftick: ${mon2efftick}`);
                boosterTick = Math.ceil(1 / (boosterCombatSpeed * 0.0007));
                monster3tfnumber = ((boosterTick + ((index) * (1 + SPDBoostConstant * (1 + (artiSpeed / 100))))) * monster3combatspeed);
                console.log(`monster3tfnumber: ${monster3tfnumber}`);
                console.log(`monster2tfnumber: ${monster2tfnumber}`);
                effectivetick = boosterTick + ((index) * (1 + SPDBoostConstant * (1 + (artiSpeed / 100))));
                if (speedLeadPosition && 3 < speedLeadPosition) {
                    monster3tunedspeed += 1;
                }
                if (monster3tfnumber > monster2tfnumber) {
                    let difference = (monster3tfnumber - monster2tfnumber) / mon2efftick;
                    let newspeed = Math.ceil(monster2combatspeed + difference) - 0.999999999;
                    let finalspeed = Math.ceil(newspeed - (1.15 + teamSpeedLead/100) * monster2basespeed);
                    let finalspeednoceil = newspeed - (1.15 + teamSpeedLead/100) * monster2basespeed;
                    console.log(`Final Speed No Ceil: ${finalspeednoceil}`);
                    const secondMonCard = monsterCards[1];
                    if (speedLeadPosition && 2 < speedLeadPosition) {
                        finalspeed += 1;
                    }
                    secondMonCard.querySelector('.combat-speed').textContent = `Speed Needed: ${finalspeed}`;
                }
            }
            card.querySelector('.combat-speed').textContent = `Speed Needed: ${tunedSpeed}`;
        }
    });
}


function getBoosterEffectTypes(boosterId) {
    const boosterMonster = getMonsterDetails(document.getElementById(boosterId).value);
    if (!boosterMonster || !boosterMonster.skills) return [];
    
    const effectIds = [];
    
    boosterMonster.skills.forEach(skillId => {
        const skill = skillsData.find(s => s.id === skillId);
        if (skill && skill.effects) {
            skill.effects.forEach(effect => {
                if (effect.effect.id === 5 || effect.effect.id === 17) {
                    effectIds.push(effect.effect.id);
                }
            });
        }
    });
    
    return [...new Set(effectIds)];
}

document.addEventListener('DOMContentLoaded', function() {
    initializeDraggableCards();
});

function getSpeedLeadPosition() {
    for (let i = 1; i <= 3; i++) {
        const speedLeadCheckbox = document.getElementById(`friendly${i}-speedlead`);
        if (speedLeadCheckbox && speedLeadCheckbox.checked) {
            return i;
        }
    }
    return null;
}

function resetCalculator() {
    // Reset all select elements to their default option
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        select.selectedIndex = 0;
    });
    
    // Reset all number inputs to 0
    const inputs = document.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
        input.value = 0;
    });
    
    // Uncheck all checkboxes
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Reset state variables
    kroaBoostTarget = 2;
    lionelPosition = null;
    
    // Reset monster names and speeds
    document.querySelectorAll('[id$="-name"]').forEach(element => {
        element.textContent = '';
    });
    
    document.querySelectorAll('[id$="-speed"]').forEach(element => {
        element.textContent = '';
    });
    
    // Reset combat speeds
    document.querySelectorAll('.combat-speed').forEach(element => {
        if (element.id.includes('friendly1')) {
            element.textContent = 'Combat Speed: 0';
        } else {
            element.textContent = 'Speed Needed: 0';
        }
    });
    
    // Reset monster images to default
    document.querySelectorAll('.monster-image').forEach(img => {
        // Set to a default image or clear src
        img.src = 'summonericon.png';
    });
    
    // Hide all special containers
    document.querySelectorAll('[id$="-speedlead-container"], [id$="-atb-boost-container"]').forEach(container => {
        container.style.display = 'none';
    });
    
    // Remove any Kroa boost target divs
    document.querySelectorAll('.kroa-boost-target').forEach(div => {
        div.remove();
    });
    
    // Remove any Chilling explanation text
    document.querySelectorAll('.chilling-explanation').forEach(p => {
        p.remove();
    });
    
    // Reset artifact speed displays
    document.querySelectorAll('.artifact-speed').forEach(container => {
        container.style.display = 'none';
    });
    
    // Remove any Kahli skill selection divs
    document.querySelectorAll('.kahli-skill-selection').forEach(div => {
    div.remove();
    });
    
    console.log('Calculator reset complete');
}

document.addEventListener('DOMContentLoaded', function() {
    fetchAndPopulateMonsters();
    fetchSkills();
    //populateMonsterOptions();
    initializeTurnOrderListeners();
    updateSpeedDisplayText();
    const resetButton = document.getElementById('reset-button');
    if (resetButton) {
        resetButton.addEventListener('click', resetCalculator);
    }
    //calculateTurnOrder();
    //checkSpeedOrder();
});