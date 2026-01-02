let monsterData = null;
let skillsData = null;
let SPDBoostConstant = 0.3;
let kroaBoostTarget = 2;
let lionelPosition = null;
let isTwoMonsterMode = false;

// Tuning mode variables
let currentTuningMode = '3-monster'; // Default mode
let maxMonsters = 3;

function getTickConstant() {
    // Return different tick constants based on tuning mode
    switch(currentTuningMode) {
        case 'rta':
            return 0.00015;
        default:
            return 0.0007;
    }
}

function handleTuningModeChange(mode) {
    console.log(`Tuning mode changed to: ${mode}`);
    currentTuningMode = mode;
    
    // Update maxMonsters based on mode
    switch(mode) {
        case '3-monster': // Siege
            maxMonsters = 3;
            isTwoMonsterMode = false;
            break;
        case '4-monster': // Arena
            maxMonsters = 4;
            isTwoMonsterMode = false;
            break;
        case 'rta': // RTA
            maxMonsters = 4;
            isTwoMonsterMode = false;
            break;
        case 'single': // Single Follow-Up
            maxMonsters = 2;
            isTwoMonsterMode = true;
            break;
        default:
            maxMonsters = 3;
            isTwoMonsterMode = false;
    }
    
    console.log(`Max monsters set to: ${maxMonsters}`);
    
    // Update monster visibility
    updateMonsterVisibility();
    
    // Update Kroa target selections for any existing Kroa monsters
    console.log(`Mode change: updating Kroa targets for maxMonsters = ${maxMonsters}, current kroaBoostTarget = ${kroaBoostTarget}`);
    const monsterCards = document.querySelectorAll('.monster');
    monsterCards.forEach((card, index) => {
        if (index < maxMonsters) { // Only process visible monsters
            const select = card.querySelector('select');
            if (select && select.value) {
                // Trigger updateMonster to regenerate Kroa options if needed
                updateMonster(select.id);
            }
        }
    });
    
    // Recalculate speeds for the new mode
    recalculateTeamSpeeds();
    updateSpeedDisplayText();
}

function updateMonsterVisibility() {
    const monsterCards = document.querySelectorAll('.monster');
    
    monsterCards.forEach((card, index) => {
        if (index < maxMonsters) {
            card.style.display = '';
            if (index < 2) {
                // Always show first 2 monsters
                card.style.maxWidth = maxMonsters === 4 ? '300px' : '350px';
            }
        } else {
            card.style.display = 'none';
        }
    });
    
    // Adjust layout for different modes
    const teamContainer = document.querySelector('.team.friendly');
    if (maxMonsters === 4) {
        teamContainer.style.justifyContent = 'space-between';
    } else if (maxMonsters === 2) {
        teamContainer.style.justifyContent = 'center';
        teamContainer.style.gap = '40px';
    } else {
        teamContainer.style.justifyContent = 'space-between';
    }
}

function getActiveMonsterIds() {
    const ids = [];
    for (let i = 1; i <= maxMonsters; i++) {
        ids.push(`friendly${i}`);
    }
    return ids;
}

function getActiveMonsterCards() {
    return Array.from(document.querySelectorAll('.monster'))
        .slice(0, maxMonsters);
}

function toggleMonsterCount() {
    isTwoMonsterMode = document.getElementById('monster-count-toggle').checked;
    
    // Get the third monster card
    const thirdMonsterCard = document.querySelector('.monster:nth-child(3)');
    
    if (isTwoMonsterMode) {
        // Hide the third monster card
        thirdMonsterCard.style.display = 'none';
        
        // Adjust the layout for 2 monsters
        document.querySelectorAll('.monster').forEach(card => {
            card.style.maxWidth = '45%';
        });
    } else {
        // Show the third monster card
        thirdMonsterCard.style.display = '';
        
        // Reset the layout for 3 monsters
        document.querySelectorAll('.monster').forEach(card => {
            card.style.maxWidth = '350px';
        });
    }
    
    // Recalculate speeds based on the new mode
    recalculateTeamSpeeds();
    updateSpeedDisplayText();
}

// Add this to your DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
    // Existing code...
    
    // Add event listener for the monster count toggle
    const monsterCountToggle = document.getElementById('monster-count-toggle');
    if (monsterCountToggle) {
        monsterCountToggle.addEventListener('change', toggleMonsterCount);
    }
});

function hasMiriam() {
    const monsterCards = getActiveMonsterCards();
    return monsterCards.some(card => {
        const select = card.querySelector('select');
        if (!select || !select.value) return false;
        
        const is2A = select.options[select.selectedIndex].text.includes('(2A)');
        const monster = getMonsterDetails(select.value, is2A);
        return monster && monster.name === "Miriam";
    });
}

function checkForMiriam() {
    // Keep this function for backwards compatibility, but it no longer changes SPDBoostConstant
    // SPDBoostConstant remains at 0.3
}


// Load the JSON data
function fetchMonsters() {
    fetch(`./monsters.json?v=${Date.now()}`)
      .then(res => res.json())
      .then(monsters => {
        const filtered = monsters.filter(m => m.obtainable && m.archetype !== "Material");
        monsterData = filtered;
        populateDropdowns(filtered);
      });
}

function fetchSkills() {
    fetch(`./skills.json?v=${Date.now()}`)
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
    const nameCount = {};
    monsters.forEach((m) => {
        if (m.awaken_level !== 2) {
            nameCount[m.name] = (nameCount[m.name] || 0) + 1;
        }
    });

    const optionsHTML = ['<option value="">Select Monster</option>']
        .concat(
            monsters
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((monster) => {
                    // Check if this is a ROBO unit (name contains "ROBO")
                    const isROBO = monster.name.toUpperCase().includes('ROBO');
                    
                    let displayName;
                    if (monster.awaken_level === 2) {
                        // For awakened monsters, show (2A)
                        displayName = `${monster.name} (2A)`;
                    } else if (nameCount[monster.name] > 1 || isROBO) {
                        // For non-awakened monsters with duplicate names OR ROBO units, show element
                        displayName = `${monster.name} (${monster.element})`;
                    } else {
                        displayName = monster.name;
                    }

                    return `<option value="${monster.name}|${monster.element}">${displayName}</option>`;
                })
        )
        .join("");

    document.querySelectorAll("select").forEach((select) => {
        select.innerHTML = optionsHTML;
    });
    
    // Initialize Choices.js on each select element
    document.querySelectorAll("select").forEach((select) => {
        // Create Choices instance with simplified configuration
        const choices = new Choices(select, {
            searchEnabled: true,
            searchPlaceholderValue: "Type to search...",
            placeholder: true,
            placeholderValue: "Select Monster",
            itemSelectText: '',
            shouldSort: false, // Don't sort again since we already sorted
            searchResultLimit: 100,
            position: 'bottom',
            // Remove custom class names to use defaults
            removeItemButton: false,
            searchFields: ['label', 'value'],
            searchChoices: true,
            renderChoiceLimit: -1,
            renderSelectedChoices: 'auto',
            loadingText: 'Loading...',
            noResultsText: 'No results found',
            noChoicesText: 'No choices to choose from',
            fuseOptions: {
                includeScore: true,
                threshold: 0.1
            }
        });
        
        // Store the Choices instance on the select element for later reference
        select.choicesInstance = choices;
        
        // Add keydown event listener to handle Enter key
        choices.input.element.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                const searchText = this.value.trim().toLowerCase();
                
                if (searchText) {
                    // Find the first matching option
                    const options = select.options;
                    let matchingOption = null;
                    
                    // Try exact match first
                    for (let i = 0; i < options.length; i++) {
                        if (options[i].text.toLowerCase() === searchText) {
                            matchingOption = options[i];
                            break;
                        }
                    }
                    
                    // If no exact match, try starts with
                    if (!matchingOption) {
                        for (let i = 0; i < options.length; i++) {
                            if (options[i].text.toLowerCase().startsWith(searchText)) {
                                matchingOption = options[i];
                                break;
                            }
                        }
                    }
                    
                    // If still no match, try contains
                    if (!matchingOption) {
                        for (let i = 0; i < options.length; i++) {
                            if (options[i].text.toLowerCase().includes(searchText)) {
                                matchingOption = options[i];
                                break;
                            }
                        }
                    }
                    
                    if (matchingOption) {
                        // Set the value
                        choices.setChoiceByValue(matchingOption.value);
                        
                        // Trigger the change event
                        updateMonster(select.id);
                        
                        // Prevent default behavior
                        e.preventDefault();
                    }
                }
            }
        });
        
        // Add change event listener
        select.addEventListener('change', function() {
            updateMonster(this.id);
        });
    });
}











/*function fetchAndPopulateMonsters() {
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
}*/

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
        // Generate target options dynamically based on maxMonsters
        let targetOptionsHTML = '<p>ATB Boost Target:</p>';
        for (let i = 2; i <= maxMonsters; i++) {
            const isChecked = i === kroaBoostTarget ? 'checked' : '';
            targetOptionsHTML += `
                <label>
                    <input type="radio" name="kroa-target-${id}" value="${i}" ${isChecked}>
                    Monster ${i}
                </label>
            `;
        }
        kroaTargetDiv.innerHTML = targetOptionsHTML;
        // Add it to the monster's special abilities section
        specialAbilitiesDiv.appendChild(kroaTargetDiv);
    }
    
    // Show/hide Kroa boost target div based on whether this monster is Kroa
    if (selectedMonster.name === 'Kroa' || selectedMonster.name === 'Ramael and Judiah' || selectedMonster.name === 'Yeji and Sapsaree') {
        // Validate kroaBoostTarget doesn't exceed maxMonsters
        if (kroaBoostTarget > maxMonsters) {
            console.log(`Kroa target ${kroaBoostTarget} exceeds maxMonsters ${maxMonsters}, falling back to Monster 2`);
            kroaBoostTarget = 2; // Fallback to Monster 2
        }
        
        // Always regenerate the HTML to ensure it matches current maxMonsters
        let targetOptionsHTML = '<p>ATB Boost Target:</p>';
        for (let i = 2; i <= maxMonsters; i++) {
            const isChecked = i === kroaBoostTarget ? 'checked' : '';
            targetOptionsHTML += `
                <label>
                    <input type="radio" name="kroa-target-${id}" value="${i}" ${isChecked}>
                    Monster ${i}
                </label>
                <p></p>
            `;
        }
        kroaTargetDiv.innerHTML = targetOptionsHTML;
        
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
    
    // Remove any existing team-up explanation from ALL cards (cleanup when any monster changes)
    document.querySelectorAll('.team-up-explanation').forEach(explanation => {
        explanation.remove();
    });
    
    // Check if we need to show team-up explanations and update ALL affected monsters
    const teamUpPosition = getTeamUpMonsterPosition();
    const verdehilePresent = isVerdehileInTeam();
    
    if (teamUpPosition && verdehilePresent) {
        // Add team-up explanation to ALL monsters that come after the team-up monster
        for (let i = teamUpPosition + 1; i <= maxMonsters; i++) {
            const affectedMonsterCard = document.querySelector(`#friendly${i}`);
            if (affectedMonsterCard && affectedMonsterCard.value) {
                const card = affectedMonsterCard.closest('.monster');
                const combatSpeedElement = card.querySelector('.combat-speed');
                
                const teamUpExplanation = document.createElement('p');
                teamUpExplanation.className = 'team-up-explanation';
                teamUpExplanation.style.color = 'green';
                teamUpExplanation.style.fontStyle = 'italic';
                teamUpExplanation.textContent = 'Calculating with boost from Team-Up';
                
                // Insert after the combat speed element (same as Chilling)
                combatSpeedElement.after(teamUpExplanation);
            }
        }
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
    const speedLeadCheckbox = document.getElementById(`${id}-speedlead`);
    
    if (selectedMonster.leader_skill && selectedMonster.leader_skill.attribute === "Attack Speed") {
        speedLeadContainer.style.display = 'block';
        speedLeadValue.textContent = selectedMonster.leader_skill.amount;
        
        // Auto-check this monster's speed lead and uncheck all others
        if (speedLeadCheckbox) {
            speedLeadCheckbox.checked = true;
            
            // Uncheck all other speed lead checkboxes
            ['friendly1', 'friendly2', 'friendly3', 'friendly4'].forEach(otherId => {
                if (otherId !== id) {
                    const otherSpeedLead = document.getElementById(`${otherId}-speedlead`);
                    if (otherSpeedLead) {
                        otherSpeedLead.checked = false;
                    }
                }
            });
        }
    } else {
        speedLeadContainer.style.display = 'none';
        // IMPORTANT: Uncheck the speed lead checkbox when monster doesn't have speed lead
        if (speedLeadCheckbox) {
            speedLeadCheckbox.checked = false;
        }
    }
    
    // Check for ATB boost skills - UPDATED WITH YEONHONG EXCEPTION
    const isYeonhong = selectedMonster.name === "Yeonhong";
    const isCraig = selectedMonster.name === "Craig";
    const isMBisonLight = selectedMonster.name === "M. Bison" && selectedMonster.element === "Light";
    const isVerdehile = selectedMonster.name === "Verdehile";
    const isJeogun = selectedMonster.name === "Jeogun";
    const isMihyang = selectedMonster.name === "Mihyang";
    const hasAtbBoost = checkForAtbBoost(selectedMonster.skills, isYeonhong);
    const atbBoostContainer = document.getElementById(`${id}-atb-boost-container`);
    const atbBoostInput = document.getElementById(`${id}-atb-boost`);

    // Hard-coded exclusion: Mihyang should never show ATB boost
    if ((hasAtbBoost || isCraig || isMBisonLight || isVerdehile || isJeogun) && !isMihyang) {
        // Get the ATB boost value and set it in the input
        let atbBoostValue = 0;

        if (isCraig || isMBisonLight || isVerdehile) {
            // Set Craig's, M. Bison (Light)'s, and Verdehile's default ATB boost to 40
            atbBoostValue = 40;
        } else if (isJeogun) {
            // Set Jeogun's default ATB boost to 15
            atbBoostValue = 15;
        } else {
            atbBoostValue = getAtbBoostValue(selectedMonster.skills, isYeonhong);
        }

        atbBoostInput.value = atbBoostValue;
        atbBoostContainer.style.display = 'block';
    } else {
        atbBoostInput.value = 0;
        atbBoostContainer.style.display = 'none';
    }
    
    // Handle Layla's effect on the booster (Monster 1)
    // If Layla is in the team, show and set ATB boost for friendly1 (only if booster has no natural boost)
    const laylaPresent = isLaylaInTeam();
    const boosterAtbContainer = document.getElementById('friendly1-atb-boost-container');
    const boosterAtbInput = document.getElementById('friendly1-atb-boost');
    
    if (laylaPresent && boosterAtbContainer && boosterAtbInput) {
        const boosterSelect = document.getElementById('friendly1');
        if (boosterSelect && boosterSelect.value) {
            const isBooster2A = boosterSelect.options[boosterSelect.selectedIndex].text.includes('(2A)');
            const boosterMonster = getMonsterDetails(boosterSelect.value, isBooster2A);
            
            if (boosterMonster) {
                // Check if booster naturally has ATB boost
                const isBoosterYeonhong = boosterMonster.name === "Yeonhong";
                const isBoosterCraig = boosterMonster.name === "Craig";
                const isBoosterMBisonLight = boosterMonster.name === "M. Bison" && boosterMonster.element === "Light";
                const isBoosterVerdehile = boosterMonster.name === "Verdehile";
                const isBoosterJeogun = boosterMonster.name === "Jeogun";
                const isBoosterMihyang = boosterMonster.name === "Mihyang";
                const boosterHasNaturalAtbBoost = checkForAtbBoost(boosterMonster.skills, isBoosterYeonhong);
                
                // Only apply Layla's boost if booster doesn't have a natural ATB boost
                if (!boosterHasNaturalAtbBoost && !isBoosterCraig && !isBoosterMBisonLight && !isBoosterVerdehile && !isBoosterJeogun && !isBoosterMihyang) {
                    boosterAtbContainer.style.display = 'block';
                    boosterAtbInput.value = 20;
                }
                // If booster has natural boost, the existing logic above already handled it
            } else {
                // No monster selected in slot 1, show Layla's boost
                boosterAtbContainer.style.display = 'block';
                boosterAtbInput.value = 20;
            }
        } else {
            // No monster selected in slot 1, show Layla's boost
            boosterAtbContainer.style.display = 'block';
            boosterAtbInput.value = 20;
        }
    } else if (!laylaPresent && boosterAtbContainer && boosterAtbInput) {
        // Layla is not in team - check if booster should still show ATB boost
        const boosterSelect = document.getElementById('friendly1');
        if (boosterSelect && boosterSelect.value) {
            const isBooster2A = boosterSelect.options[boosterSelect.selectedIndex].text.includes('(2A)');
            const boosterMonster = getMonsterDetails(boosterSelect.value, isBooster2A);
            
            if (boosterMonster) {
                // Re-check if booster naturally has ATB boost
                const isBoosterYeonhong = boosterMonster.name === "Yeonhong";
                const isBoosterCraig = boosterMonster.name === "Craig";
                const isBoosterMBisonLight = boosterMonster.name === "M. Bison" && boosterMonster.element === "Light";
                const isBoosterVerdehile = boosterMonster.name === "Verdehile";
                const isBoosterJeogun = boosterMonster.name === "Jeogun";
                const isBoosterMihyang = boosterMonster.name === "Mihyang";
                const boosterHasNaturalAtbBoost = checkForAtbBoost(boosterMonster.skills, isBoosterYeonhong);
                
                // If booster doesn't have natural boost, hide the container (Layla's boost is gone)
                if (!boosterHasNaturalAtbBoost && !isBoosterCraig && !isBoosterMBisonLight && !isBoosterVerdehile && !isBoosterJeogun && !isBoosterMihyang) {
                    boosterAtbContainer.style.display = 'none';
                    boosterAtbInput.value = 0;
                }
                // If booster has natural boost, it should already be visible from the normal logic above
            } else {
                // No monster, hide the container
                boosterAtbContainer.style.display = 'none';
                boosterAtbInput.value = 0;
            }
        } else {
            // No monster selected, hide the container
            boosterAtbContainer.style.display = 'none';
            boosterAtbInput.value = 0;
        }
    }
    
    // Handle speed buff for artifacts
    if (id === 'friendly1') {
        const hasSpeedBuff = selectedMonster.skills.some(skillId => {
            const skill = skillsData.find(s => s.id === skillId);
            // Only include speed buff if it's not self-only (same logic as ATB boost)
            return skill && skill.effects.some(effect => 
                effect.effect.id === 5 && !effect.self_effect
            );
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
    console.log(``);
    console.log(`Entered ATB Boost check`);
    for (const skillId of skillIds) {
        const skill = skillsData.find(s => s.id === skillId);
        if (!skill || !skill.effects) continue;
        for (const effect of skill.effects) {
            const isAtbBoost = (effect.effect.id === 17 || effect.effect.name === "Increase ATB");
            console.log(`Skill: ${skill.name}`);
            console.log(`Skill Effect: ${effect.effect.name}`);
            console.log(`isAtbBoost: ${isAtbBoost}`);
            console.log(`Self_Effect: ${effect.self_effect}`);
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
    console.log(``);
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

function hasTeamUpSkill(monster) {
    if (!monster || !monster.skills || !skillsData) return false;
    
    return monster.skills.some(skillId => {
        const skill = skillsData.find(s => s.id === skillId);
        if (!skill || !skill.effects) return false;
        
        return skill.effects.some(effect => effect.effect.id === 56);
    });
}

function isVerdehileInTeam() {
    const monsterCards = getActiveMonsterCards();
    
    return monsterCards.some(card => {
        const select = card.querySelector('select');
        if (!select || !select.value) return false;
        
        const is2A = select.options[select.selectedIndex].text.includes('(2A)');
        const monster = getMonsterDetails(select.value, is2A);
        
        return monster && monster.name === 'Verdehile';
    });
}

function isLaylaInTeam() {
    const monsterCards = getActiveMonsterCards();
    
    return monsterCards.some(card => {
        const select = card.querySelector('select');
        if (!select || !select.value) return false;
        
        const is2A = select.options[select.selectedIndex].text.includes('(2A)');
        const monster = getMonsterDetails(select.value, is2A);
        
        return monster && monster.name === 'Layla';
    });
}

function getTeamUpMonsterPosition() {
    const monsterCards = getActiveMonsterCards();
    
    for (let i = 0; i < monsterCards.length; i++) {
        const card = monsterCards[i];
        const select = card.querySelector('select');
        if (!select || !select.value) continue;
        
        const is2A = select.options[select.selectedIndex].text.includes('(2A)');
        const monster = getMonsterDetails(select.value, is2A);
        
        if (monster && hasTeamUpSkill(monster)) {
            return i + 1; // Return 1-based position
        }
    }
    
    return null;
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
        // Uncheck all other speed lead checkboxes (including friendly4 for Arena/RTA)
        ['friendly1', 'friendly2', 'friendly3', 'friendly4'].forEach(id => {
            if (id !== monsterId) {
                const otherSpeedLead = document.getElementById(`${id}-speedlead`);
                if (otherSpeedLead) otherSpeedLead.checked = false;
            }
        });
    }
    
    console.log(`Monster ${monsterId} Speed Lead (${speedLeadValue}%) set to ${isSpeedLead}`);
    
    // Recalculate once after all changes
    recalculateTeamSpeeds();
    updateSpeedDisplayText();
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

function updateExclude(monsterId) {
    const excludeCheckbox = document.getElementById(`${monsterId}-exclude`);
    const isExcluded = excludeCheckbox.checked;
    console.log(`Monster ${monsterId} Exclude set to ${isExcluded}`);
    
    // Handle Kroa target fallback logic
    handleKroaTargetExclusion(monsterId, isExcluded);
    
    // Recalculate speeds and update display
    recalculateTeamSpeeds();
    // Call updateSpeedDisplayText to properly handle excluded/unexcluded monsters
    updateSpeedDisplayText();
}

function handleKroaTargetExclusion(monsterId, isExcluded) {
    // Extract position number from monsterId (e.g., "friendly2" -> 2)
    const position = parseInt(monsterId.replace('friendly', ''));
    
    // Handle fallback when excluding
    if (isExcluded && kroaBoostTarget === position) {
        console.log(`Kroa target Monster ${position} was excluded, applying fallback logic`);
        
        // Apply fallback logic based on which monster was excluded
        let newTarget;
        if (position === 2) {
            // If Monster 2 excluded -> fallback to Monster 3
            newTarget = 3;
        } else if (position === 3) {
            // If Monster 3 excluded -> fallback to Monster 2
            newTarget = 2;
        } else if (position === 4) {
            // If Monster 4 excluded -> fallback to Monster 2
            newTarget = 2;
        }
        
        // Ensure fallback target doesn't exceed maxMonsters and isn't also excluded
        if (newTarget && newTarget <= maxMonsters) {
            const fallbackExcludeCheckbox = document.getElementById(`friendly${newTarget}-exclude`);
            const isFallbackExcluded = fallbackExcludeCheckbox && fallbackExcludeCheckbox.checked;
            
            if (!isFallbackExcluded) {
                kroaBoostTarget = newTarget;
                console.log(`Kroa target changed to Monster ${newTarget}`);
            }
        }
    }
    
    // Hide/show the radio button option for the excluded/included monster
    updateKroaTargetVisibility();
}

function updateKroaTargetVisibility() {
    // Find all Kroa target radio buttons and their labels
    document.querySelectorAll('input[name^="kroa-target-"]').forEach(radio => {
        const targetPosition = parseInt(radio.value);
        const label = radio.parentElement; // The label that contains the radio button
        
        // Check if this monster position is excluded
        const excludeCheckbox = document.getElementById(`friendly${targetPosition}-exclude`);
        const isExcluded = excludeCheckbox && excludeCheckbox.checked;
        
        if (isExcluded) {
            // Hide the entire label (radio button + text)
            label.style.display = 'none';
        } else {
            // Show the label
            label.style.display = 'inline-block';
            // Update radio button selection to reflect current kroaBoostTarget
            radio.checked = (targetPosition === kroaBoostTarget);
        }
    });
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
        
        const is2A = select.options[select.selectedIndex].text.includes('(2A)');
        const selectedMonster = getMonsterDetails(select.value, is2A);
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
        let dragTimeout = null;
        let startPosition = null;

        card.addEventListener('mousedown', function(e) {
            // Enhanced check - specifically look for radio buttons and other interactive elements
            if (e.target.tagName === 'INPUT' || 
                e.target.tagName === 'LABEL' || 
                e.target.tagName === 'SELECT' || 
                e.target.tagName === 'BUTTON' ||
                e.target.type === 'radio' ||
                e.target.classList.contains('tooltip-icon') ||
                e.target.closest('.kroa-boost-target') ||
                e.target.closest('.choices') ||
                (e.target.tagName === 'LABEL' && e.target.textContent && e.target.textContent.includes('Monster'))) {
                return;
            }

            e.preventDefault();
            
            // Store initial mouse position
            startPosition = { x: e.pageX, y: e.pageY };
            
            // Set a timeout before actually starting the drag
            dragTimeout = setTimeout(() => {
                if (startPosition) { // Only start drag if mouse is still down
                    startDrag(e);
                }
            }, 500); // 500ms delay
            
            // Listen for mouseup to cancel the drag timeout
            const cancelDrag = () => {
                if (dragTimeout) {
                    clearTimeout(dragTimeout);
                    dragTimeout = null;
                }
                startPosition = null;
                document.removeEventListener('mouseup', cancelDrag);
            };
            
            document.addEventListener('mouseup', cancelDrag);
        });

        function startDrag(e) {
            isDragging = true;

            // Get the card's bounding box relative to the page
            const cardRect = card.getBoundingClientRect();
            offsetX = startPosition.x - cardRect.left;
            offsetY = startPosition.y - cardRect.top;

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

            moveAt(startPosition.x, startPosition.y);

            document.addEventListener('mousemove', mouseMove);
            document.addEventListener('mouseup', mouseUp);
        }

        // Rest of the draggable cards function remains unchanged
        function moveAt(pageX, pageY) {
            card.style.left = `${pageX - offsetX - row.getBoundingClientRect().left}px`;
            card.style.top = `${pageY - offsetY - row.getBoundingClientRect().top}px`;
        }

        function mouseMove(e) {
            if (!isDragging) return;

            moveAt(e.pageX, e.pageY);

            // Only consider visible cards (not hidden ones) and limit to maxMonsters
            const allCards = Array.from(row.querySelectorAll('.monster:not(.dragging):not(.placeholder)'));
            const cardsArray = allCards
                .filter(card => card.style.display !== 'none')
                .slice(0, maxMonsters);
            
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
                // Only append after the last visible card, not after hidden cards
                if (cardsArray.length > 0) {
                    const lastVisibleCard = cardsArray[cardsArray.length - 1];
                    // Insert after the last visible card (before its next sibling, or at end if no sibling)
                    row.insertBefore(placeholder, lastVisibleCard.nextSibling);
                } else {
                    // Fallback: append to row (shouldn't happen in normal use)
                    row.appendChild(placeholder);
                }
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

    // Get all cards in their new order, but only include visible cards (respect maxMonsters)
    // Filter out hidden cards and limit to maxMonsters to prevent processing hidden 4th monster
    const allCards = Array.from(row.querySelectorAll('.monster'))
        .filter(card => card.style.display !== 'none')
        .slice(0, maxMonsters);
    
    // Store the current state of all monsters before updating IDs
    const monsterStates = allCards.map(card => {
        const selectElement = card.querySelector('select');
        const currentId = selectElement.id;
        
        // Store the complete monster information
        return {
            originalId: currentId,
            value: selectElement.value,
            selectedIndex: selectElement.selectedIndex, // Store the actual selected index
            selectedText: selectElement.options[selectElement.selectedIndex]?.text || '',
            runeSpeed: document.getElementById(`${currentId}-rune-speed`)?.value || 0,
            artifactSpeed: document.getElementById(`${currentId}-artifact-speed`)?.value || 0,
            isSwift: document.getElementById(`${currentId}-swift`)?.checked || false,
            atbBoost: document.getElementById(`${currentId}-atb-boost`)?.value || 0,
            isSpeedLead: document.getElementById(`${currentId}-speedlead`)?.checked || false
        };
    });
    
    // Update all IDs to match new positions
    allCards.forEach((card, index) => {
        const newPosition = index + 1;
        
        // Update all element IDs within this card
        card.querySelectorAll('[id]').forEach(element => {
            const currentId = element.id;
            const match = currentId.match(/^(friendly\d+)(.*)$/);
            
            if (match) {
                const suffix = match[2]; // e.g., "-rune-speed"
                element.id = `friendly${newPosition}${suffix}`;
                
                // Also update any for attributes in labels
                if (element.tagName === 'INPUT') {
                    const label = card.querySelector(`label[for="${currentId}"]`);
                    if (label) {
                        label.setAttribute('for', `friendly${newPosition}${suffix}`);
                    }
                }
            }
        });
    });
    
    // Now apply the stored values to the new positions
    monsterStates.forEach((state, index) => {
        const newId = `friendly${index + 1}`;
        const newSelect = document.getElementById(newId);
        
        if (newSelect && state.selectedIndex > 0) { // Only process if a monster was selected
            // First, destroy the Choices instance if it exists
            if (newSelect.choicesInstance) {
                newSelect.choicesInstance.destroy();
            }
            
            // Set the value and selected index on the raw select element
            newSelect.value = state.value;
            newSelect.selectedIndex = state.selectedIndex;
            
            // Reinitialize Choices.js
            const choices = new Choices(newSelect, {
                searchEnabled: true,
                searchPlaceholderValue: "Type to search...",
                placeholder: true,
                placeholderValue: "Select Monster",
                itemSelectText: '',
                shouldSort: false,
                searchResultLimit: 100,
                position: 'bottom',
                removeItemButton: false,
                searchFields: ['label', 'value'],
                searchChoices: true,
                renderChoiceLimit: -1,
                renderSelectedChoices: 'auto',
                loadingText: 'Loading...',
                noResultsText: 'No results found',
                noChoicesText: 'No choices to choose from',
                fuseOptions: {
                    includeScore: true,
                    threshold: 0.1
                }
            });
            
            // Store the new Choices instance
            newSelect.choicesInstance = choices;
            
            // Add keydown event listener to handle Enter key
            choices.input.element.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    const searchText = this.value.trim().toLowerCase();
                    
                    if (searchText) {
                        // Find the first matching option
                        const options = newSelect.options;
                        let matchingOption = null;
                        
                        // Try exact match first
                        for (let i = 0; i < options.length; i++) {
                            if (options[i].text.toLowerCase() === searchText) {
                                matchingOption = options[i];
                                break;
                            }
                        }
                        
                        // If no exact match, try starts with
                        if (!matchingOption) {
                            for (let i = 0; i < options.length; i++) {
                                if (options[i].text.toLowerCase().startsWith(searchText)) {
                                    matchingOption = options[i];
                                    break;
                                }
                            }
                        }
                        
                        // If still no match, try contains
                        if (!matchingOption) {
                            for (let i = 0; i < options.length; i++) {
                                if (options[i].text.toLowerCase().includes(searchText)) {
                                    matchingOption = options[i];
                                    break;
                                }
                            }
                        }
                        
                        if (matchingOption) {
                            // Set the value
                            choices.setChoiceByValue(matchingOption.value);
                            
                            // Trigger the change event
                            updateMonster(newSelect.id);
                            
                            // Prevent default behavior
                            e.preventDefault();
                        }
                    }
                }
            });
            
            // After updating all IDs and before applying stored values, standardize the order of containers
allCards.forEach((card, index) => {
    const newPosition = index + 1;
    const specialAbilitiesDiv = card.querySelector('.monster-special-abilities');
    
    if (specialAbilitiesDiv) {
        // Get all the containers
        const speedLeadContainer = specialAbilitiesDiv.querySelector(`#friendly${newPosition}-speedlead-container`);
        const atbBoostContainer = specialAbilitiesDiv.querySelector(`#friendly${newPosition}-atb-boost-container`);
        const kroaTargetDiv = specialAbilitiesDiv.querySelector('.kroa-boost-target');
        
        // Collect containers that exist
        const containersToOrder = [];
        
        // Remove all containers from DOM first
        if (atbBoostContainer && atbBoostContainer.parentNode) {
            atbBoostContainer.parentNode.removeChild(atbBoostContainer);
            containersToOrder.push({ element: atbBoostContainer, order: 1 });
        }
        if (kroaTargetDiv && kroaTargetDiv.parentNode) {
            kroaTargetDiv.parentNode.removeChild(kroaTargetDiv);
            containersToOrder.push({ element: kroaTargetDiv, order: 2 });
        }
        if (speedLeadContainer && speedLeadContainer.parentNode) {
            speedLeadContainer.parentNode.removeChild(speedLeadContainer);
            containersToOrder.push({ element: speedLeadContainer, order: 3 });
        }
        
        // Sort by order and add them back
        containersToOrder.sort((a, b) => a.order - b.order);
        containersToOrder.forEach(container => {
            specialAbilitiesDiv.appendChild(container.element);
        });
    }
});

            
            // Add change event listener
            newSelect.addEventListener('change', function() {
                updateMonster(this.id);
            });
            
            // Update the monster to ensure proper initialization
            updateMonster(newId);
            
            // Update other values
            const runeSpeedInput = document.getElementById(`${newId}-rune-speed`);
            if (runeSpeedInput) runeSpeedInput.value = state.runeSpeed;
            
            const artifactSpeedInput = document.getElementById(`${newId}-artifact-speed`);
            if (artifactSpeedInput) artifactSpeedInput.value = state.artifactSpeed;
            
            const swiftCheckbox = document.getElementById(`${newId}-swift`);
            if (swiftCheckbox) swiftCheckbox.checked = state.isSwift;
            
            // Set ATB boost and speed lead values
            const atbBoostInput = document.getElementById(`${newId}-atb-boost`);
            if (atbBoostInput) atbBoostInput.value = state.atbBoost;
            
            const speedLeadCheckbox = document.getElementById(`${newId}-speedlead`);
            if (speedLeadCheckbox) speedLeadCheckbox.checked = state.isSpeedLead;
        }
    });
    
    // Force a complete recalculation
    checkForMiriam();
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
    const monsterCards = getActiveMonsterCards();
    const combatSpeedToggle = document.getElementById('cmb-speed-toggle');
    const isShowCombatSpeed = combatSpeedToggle ? combatSpeedToggle.checked : false;
    
    monsterCards.forEach((card, index) => {
        const runeSpeedDiv = card.querySelector('.rune-speed');
        const speedElement = card.querySelector('.combat-speed');
        
        // Check if this monster is excluded first
        if (index > 0) { // Only check exclusion for follow-up monsters
            const monsterId = card.querySelector('select').id;
            const excludeCheckbox = document.getElementById(`${monsterId}-exclude`);
            const isExcluded = excludeCheckbox && excludeCheckbox.checked;
            
            if (isExcluded) {
                // Keep the EXCLUDED text and skip other processing
                return;
            }
        }
        
        const currentSpeed = speedElement.textContent.split(': ')[1];
        
        if (index === 0) {
            runeSpeedDiv.style.display = 'block';
            speedElement.textContent = `Combat Speed: ${currentSpeed}`;
        } else {
            runeSpeedDiv.style.display = 'none';
            // Check toggle state for follow-up monsters
            if (isShowCombatSpeed) {
                speedElement.textContent = `Combat Speed: ${currentSpeed}`;
            } else {
            speedElement.textContent = `Speed Needed: ${currentSpeed}`;
            }
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
    if (currentIndex >= maxMonsters - 1 || (targetPosition && targetPosition > maxMonsters)) {
        return 0;
    }
    
    // Check for team-up + Verdehile condition (applies team-wide)
    let verdehileTeamUpBoost = 0;
    const teamUpPosition = getTeamUpMonsterPosition();
    const currentMonsterPosition = currentIndex + 1; // Convert to 1-based position
    
    // Apply Verdehile boost to ALL monsters if:
    // 1. There's a team-up monster in the team
    // 2. Verdehile is in the team  
    // 3. Current monster's turn comes AFTER the team-up monster's turn
    if (teamUpPosition && isVerdehileInTeam() && currentMonsterPosition > teamUpPosition) {
        verdehileTeamUpBoost = 40; // Verdehile's standard ATB boost applies to everyone
    }
    
    for(let i = 0; i <= currentIndex; i++) {
        const monsterBoost = parseFloat(document.getElementById(`friendly${i+1}-atb-boost`).value) || 0;
        
        // Hard-coded exclusion: Skip Mihyang's ATB boost completely
        const monsterSelect = document.getElementById(`friendly${i+1}`);
        if (monsterSelect && monsterSelect.value) {
            const is2A = monsterSelect.options[monsterSelect.selectedIndex].text.includes('(2A)');
            const selectedMonster = getMonsterDetails(monsterSelect.value, is2A);
            if (selectedMonster && selectedMonster.name === "Mihyang") {
                continue; // Skip Mihyang's boost
            }
        }
        
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
    
    // Add Verdehile team-up boost if conditions are met
    totalBoost += verdehileTeamUpBoost;
    
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
            // Only include speed buff if it's not self-only (same logic as ATB boost)
            hasSpeedBuff = monster.skills.some(skillId => {
                const skill = skillsData.find(s => s.id === skillId);
                return skill && skill.effects.some(effect => 
                    effect.effect.id === 5 && !effect.self_effect
                );
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
    // If Miriam is present, add 0.35 to the artifact speed calculation
    const miriamBonus = hasMiriam() ? 0.35 : 0;
    const speedModifier = 1 + SPDBoostConstant * (1 + miriamBonus + artiSpeedSum / 100);
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
    const miriamBonus = hasMiriam() ? 0.35 : 0;
    const monsterCards = Array.from(document.querySelectorAll('.monster'));
    const activeMonsterIds = getActiveMonsterIds();
    let teamSpeedLead = getSpeedLead(activeMonsterIds);
    
    // Get the element restriction for the active speed lead (if any)
    let speedLeadElement = null;
    activeMonsterIds.forEach(id => {
        const select = document.getElementById(id);
        if (!select || !select.value) return;
        
        const is2A = select.options[select.selectedIndex].text.includes('(2A)');
        const leaderMonster = getMonsterDetails(select.value, is2A);
        const speedLeadCheckbox = document.getElementById(`${id}-speedlead`);
        
        if (leaderMonster && leaderMonster.leader_skill && speedLeadCheckbox && speedLeadCheckbox.checked) {
            speedLeadElement = leaderMonster.leader_skill.element; // Will be null or an element
        }
    });
    
    // Bool: does the speed lead have an element restriction?
    const hasElementRestriction = speedLeadElement !== null;
    
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
    
    // Check if booster's element matches (only if there's a restriction)
    let boosterMatchingElementCheck = true;
    if (hasElementRestriction && boosterMonster) {
        boosterMatchingElementCheck = speedLeadElement === boosterMonster.element;
    }
    
    // If element doesn't match, set teamSpeedLead to 0 for booster
    const originalTeamSpeedLead = teamSpeedLead;
    if (!boosterMatchingElementCheck) {
        teamSpeedLead = 0;
    }
    
    // Simple booster speed calculation
    let boosterCombatSpeed = Math.ceil((1.15 + teamSpeedLead/100) * boosterBaseSpeed + boosterRuneSpeed);
    
    // Restore original teamSpeedLead after booster calculation
    teamSpeedLead = originalTeamSpeedLead;
    if (boosterMonster && boosterMonster.name === "Chilling") {
        boosterCombatSpeed = boosterCombatSpeed + 40;
        isChilling = true;
    }
    if (boosterMonster && boosterMonster.name === "Kroa") {
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
    monster4tunedspeed = null;
    monster2combatspeed = null;
    monster3combatspeed = null;
    monster4combatspeed = null;
    monster2tfnumber = null;
    monster3tfnumber = null;
    monster4tfnumber = null;
    monster2basespeed = null;
    monster3basespeed = null;
    monster4basespeed = null;
    mon2efftick = null;
    mon3efftick = null;
    
    // Track which monsters have been adjusted to prevent double adjustments
    const adjustedMonsters = new Set();
    
    // Get effects by position using the existing function
    const effectsByPosition = getEffectsByPosition();
    
    monsterCards.slice(1).forEach((card, index) => {
        const monsterId = card.querySelector('select').id;
        const monsterSelect = document.getElementById(monsterId);
        console.log(`Processing card at index ${index}, monsterId: ${monsterId}`);
        
        // Check if this monster is excluded from tuning FIRST
        const excludeCheckbox = document.getElementById(`${monsterId}-exclude`);
        const isExcluded = excludeCheckbox && excludeCheckbox.checked;
        
        console.log(`${monsterId}: excludeCheckbox exists = ${!!excludeCheckbox}, isExcluded = ${isExcluded}`);
        
        if (isExcluded) {
            // Show "EXCLUDED" in red for excluded monsters
            console.log(`Setting ${monsterId} to EXCLUDED`);
            const combatSpeedElement = card.querySelector('.combat-speed');
            console.log(`Found combat speed element:`, combatSpeedElement);
            if (combatSpeedElement) {
                combatSpeedElement.innerHTML = `<span style="color: red; font-weight: bold;">EXCLUDED</span>`;
                console.log(`Set innerHTML to:`, combatSpeedElement.innerHTML);
            } else {
                console.log(`ERROR: Could not find .combat-speed element for ${monsterId}`);
            }
            return; // Skip calculation for excluded monsters
        }
        
        const isMonster2A = monsterSelect.options[monsterSelect.selectedIndex].text.includes('(2A)');
        const monster = getMonsterDetails(monsterSelect.value, isMonster2A);
        if (!monster) return;
        
        // Check if element matches (only if there's a restriction)
        let matchingElementCheck = true;
        if (hasElementRestriction) {
            matchingElementCheck = speedLeadElement === monster.element;
        }
        
        // If element doesn't match, set teamSpeedLead to 0 for this monster
        const savedTeamSpeedLead = teamSpeedLead;
        if (!matchingElementCheck) {
            teamSpeedLead = 0;
        }
        
        const artiSpeed = parseFloat(document.getElementById(`${monsterId}-artifact-speed`).value) || 0;
        const thisMonsterPosition = parseInt(monsterId.replace('friendly', ''));
        const currentPosition = thisMonsterPosition;
        let accumulatedAtbBoost = getAccumulatedAtbBoost(index, thisMonsterPosition);
        const combatSpeedToggle = document.getElementById('cmb-speed-toggle');
        const isShowCombatSpeed = combatSpeedToggle ? combatSpeedToggle.checked : false;
        
        // Determine if speed buff is active for this monster
        let speedBuffActive = false;
        
        // If Monster 1 has speed buff, it applies to all
        if (applyModifier) {
            speedBuffActive = true;
        } else {
            // Check if any monster before this one has a speed buff
            // For Monster 2 (position 2), only Monster 1's buff would apply
            // For Monster 3 (position 3), both Monster 1 and 2's buffs could apply
            for (let i = 0; i < currentPosition - 1; i++) {
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
            console.log(`Miriam Bonus: ${miriamBonus > 0 ? 'Active (' + miriamBonus + ')' : 'Inactive'}`);
            
            // Check if this monster should receive Kroa's ATB boost
            let shouldReceiveKroaBoost = false;
            if (currentPosition === kroaBoostTarget) {
                // Check if the target monster is excluded
                const targetExcludeCheckbox = document.getElementById(`friendly${kroaBoostTarget}-exclude`);
                const isTargetExcluded = targetExcludeCheckbox && targetExcludeCheckbox.checked;
                
                if (!isTargetExcluded) {
                    shouldReceiveKroaBoost = true;
                    console.log(`Kroa boost applied to Monster ${kroaBoostTarget} (position ${currentPosition + 1})`);
                } else {
                    console.log(`Kroa boost NOT applied - target Monster ${kroaBoostTarget} is excluded`);
                }
            }
            
            accumulatedAtbBoost = shouldReceiveKroaBoost ? accumulatedAtbBoost : 0;
            let tunedSpeed = calculateTunedSpeed(
                teamSpeedLead,
                boosterBaseSpeed,
                boosterRuneSpeed,
                getTickConstant(),
                thisMonsterPosition - 1,
                accumulatedAtbBoost,
                artiSpeed,
                monster.speed,
                isSwift,
                speedBuffActive,
                isChilling
            );
            // For Kroa, check toggle state for follow-up monsters
            if (isShowCombatSpeed && thisMonsterPosition > 1) {
                const baseSpeedWithLead = (1.15 + teamSpeedLead/100) * monster.speed;
                const totalCombatSpeed = Math.ceil(baseSpeedWithLead + tunedSpeed);
                card.querySelector('.combat-speed').textContent = `Combat Speed: ${totalCombatSpeed}`;
            } else {
                if (thisMonsterPosition === 1) {
                    card.querySelector('.combat-speed').textContent = `Combat Speed: ${tunedSpeed}`;
                } else {
                    card.querySelector('.combat-speed').textContent = `Speed Needed: ${tunedSpeed}`;
                }
            }
        } else {
            // Calculate iteration based on ticks after booster
            // Monster 1 (booster) = tick 0, Monster 2 = tick 1, Monster 3 = tick 2, Monster 4 = tick 3
            let iterationValue = thisMonsterPosition - 1;
            
            console.log(`Monster ${thisMonsterPosition}: iteration value (ticks after booster) = ${iterationValue}`);
            
            let tunedSpeed = calculateTunedSpeed(
                teamSpeedLead,
                boosterBaseSpeed,
                boosterRuneSpeed,
                getTickConstant(),
                iterationValue,
                accumulatedAtbBoost,
                artiSpeed,
                monster.speed,
                isSwift,
                speedBuffActive,
                isChilling
            );
            

            
            // Rest of the existing code for Monster 2 and 3 calculations...
            if (thisMonsterPosition === 2) {
                // Calculating Monster 2's speed
                console.log(`Monster: ${monster.name}`);
                console.log(`Miriam Bonus: ${miriamBonus > 0 ? 'Active (' + miriamBonus + ')' : 'Inactive'}`);
                monster2tunedspeed = tunedSpeed;
                if (speedLeadPosition && 2 < speedLeadPosition) {
                    monster2tunedspeed += 1;
                }
                monster2rawspeed = (1.15 + teamSpeedLead/100) * monster.speed;
                monster2combatspeed = Math.ceil(monster2tunedspeed + monster2rawspeed);
                
                // Check if Monster 2 is faster than the booster and needs adjustment
                if (monster2combatspeed > boosterCombatSpeed && !adjustedMonsters.has(2)) {
                    console.log(`Adjusting Monster 2 due to booster conflict`);
                    console.log(`Original Monster 2 combat speed: ${monster2combatspeed}`);
                    console.log(`Booster combat speed: ${boosterCombatSpeed}`);
                    
                    // Adjust Monster 2 to match booster's exact combat speed
                    const baseSpeedWithLead = (1.15 + teamSpeedLead/100) * monster.speed;
                    const requiredCombatSpeed = boosterCombatSpeed; // Same combat speed as booster
                    let finalspeed = requiredCombatSpeed - Math.ceil(baseSpeedWithLead);
                    
                    if (finalspeed <= 0) {
                        finalspeed = 0; 
                    }
                    
                    // Update Monster 2's display
                    const monster2Card = monsterCards[1];
                    if (isShowCombatSpeed) {
                        const baseSpeedWithLead = (1.15 + teamSpeedLead/100) * monster.speed;
                        const totalCombatSpeed = Math.ceil(baseSpeedWithLead + finalspeed);
                        monster2Card.querySelector('.combat-speed').textContent = `Combat Speed: ${totalCombatSpeed}`;
                    } else {
                        monster2Card.querySelector('.combat-speed').textContent = `Speed Needed: ${finalspeed}`;
                    }
                    
                    // Mark Monster 2 as adjusted and update combat speed
                    adjustedMonsters.add(2);
                    monster2combatspeed = boosterCombatSpeed; // Now same speed as booster
                    monster2tunedspeed = finalspeed; // Update tuned speed as well
                    
                    console.log(`Monster 2 adjusted to match booster's combat speed: ${finalspeed}`);
                }
                
                boosterTick = Math.ceil(1 / (boosterCombatSpeed * getTickConstant()));
                mon2efftick = boosterTick + ((index) * (1 + SPDBoostConstant * (1 + miriamBonus + (artiSpeed / 100))));
                monster2tfnumber = ((boosterTick + ((index) * (1 + SPDBoostConstant * (1 + miriamBonus + (artiSpeed / 100))))) * monster2combatspeed);
                monster2basespeed = monster.speed;
                }
            if (thisMonsterPosition === 3) {
                // Monster 3 calculations
                console.log(`Monster: ${monster.name}`);
                console.log(`Miriam Bonus: ${miriamBonus > 0 ? 'Active (' + miriamBonus + ')' : 'Inactive'}`);
                monster3tunedspeed = tunedSpeed;
                
                // Apply speed lead adjustment BEFORE combat speed calculation (like Monster 2)
                if (speedLeadPosition && 3 < speedLeadPosition) {
                    monster3tunedspeed += 1;
                }
                
                monster3rawspeed = (1.15 + teamSpeedLead/100) * monster.speed;
                monster3combatspeed = Math.ceil(monster3tunedspeed + monster3rawspeed);
                monster3basespeed = monster.speed;
                console.log(``);
                console.log(`monster3combatspeed: ${monster3combatspeed}`);
                console.log(`monster2combatspeed: ${monster2combatspeed}`);
                console.log(`mon2efftick: ${mon2efftick}`);
                boosterTick = Math.ceil(1 / (boosterCombatSpeed * getTickConstant()));
                monster3tfnumber = ((boosterTick + ((index) * (1 + SPDBoostConstant * (1 + miriamBonus + (artiSpeed / 100))))) * monster3combatspeed);
                console.log(`monster3tfnumber: ${monster3tfnumber}`);
                console.log(`monster2tfnumber: ${monster2tfnumber}`);
                mon3efftick = boosterTick + ((index) * (1 + SPDBoostConstant * (1 + miriamBonus + (artiSpeed / 100))));
                
                // In 3-monster mode, check for Monster 3 vs Monster 2 conflicts (since Monster 4 logic won't run)
                if (maxMonsters === 3) {
                    // Check if Monster 2 is slower than Monster 3 and needs adjustment
                    if (monster2combatspeed != null && monster2combatspeed < monster3combatspeed && !adjustedMonsters.has(2)) {
                        console.log(`Adjusting Monster 2 due to Monster 3 conflict in 3-monster mode`);
                        console.log(`Original Monster 2 combat speed: ${monster2combatspeed}`);
                        console.log(`Monster 3 combat speed: ${monster3combatspeed}`);
                        
                        // Adjust Monster 2 to match Monster 3's exact combat speed
                        // Get Monster 2's element and check if it matches
                        const monster2Card = monsterCards[1];
                        const monster2Select = monster2Card.querySelector('select');
                        const isMonster2_2A = monster2Select.options[monster2Select.selectedIndex].text.includes('(2A)');
                        const monster2Details = getMonsterDetails(monster2Select.value, isMonster2_2A);
                        let monster2MatchingElementCheck = true;
                        if (hasElementRestriction && monster2Details) {
                            monster2MatchingElementCheck = speedLeadElement === monster2Details.element;
                        }
                        
                        // If element doesn't match, set teamSpeedLead to 0 for Monster 2 calculation
                        const savedTeamSpeedLeadForM2 = teamSpeedLead;
                        if (!monster2MatchingElementCheck) {
                            teamSpeedLead = 0;
                        }
                        
                        const baseSpeedWithLead = (1.15 + teamSpeedLead/100) * monster2basespeed;
                        const requiredCombatSpeed = monster3combatspeed; // Same combat speed as Monster 3
                        let finalspeed = requiredCombatSpeed - Math.ceil(baseSpeedWithLead);
                        
                        // Remove +1 speed adjustment - keep speeds exactly the same
                        // if (speedLeadPosition && 2 < speedLeadPosition) {
                        //     finalspeed += 1;
                        // }
                        if (finalspeed <= 0) {
                            finalspeed = 0; 
                        }
                        
                        // Update Monster 2's display
                        if (isShowCombatSpeed) {
                            const baseSpeedWithLead = (1.15 + teamSpeedLead/100) * monster2basespeed;
                            const totalCombatSpeed = Math.ceil(baseSpeedWithLead + finalspeed);
                            monster2Card.querySelector('.combat-speed').textContent = `Combat Speed: ${totalCombatSpeed}`;
                        } else {
                            monster2Card.querySelector('.combat-speed').textContent = `Speed Needed: ${finalspeed}`;
                        }
                        
                        // Restore teamSpeedLead after Monster 2 calculation
                        teamSpeedLead = savedTeamSpeedLeadForM2;
                        
                        // Mark Monster 2 as adjusted and update combat speed
                        adjustedMonsters.add(2);
                        monster2combatspeed = monster3combatspeed; // Now same speed as Monster 3
                        
                        console.log(`Monster 2 adjusted to match Monster 3's combat speed: ${finalspeed}`);
                    }
                }
            }
            if (thisMonsterPosition === 4) {
                // Monster 4 calculations
                console.log(`Monster 4: ${monster.name}`);
                console.log(`Miriam Bonus: ${miriamBonus > 0 ? 'Active (' + miriamBonus + ')' : 'Inactive'}`);
                console.log(`Monster 4 base speed: ${monster.speed}`);
                console.log(`Monster 2 base speed: ${monster2basespeed}`);
                console.log(`Monster 4 tunedSpeed from calculation: ${tunedSpeed}`);
                console.log(`Monster 2 tunedSpeed: ${monster2tunedspeed}`);
                console.log(`Monster 4 index in forEach: ${index}`);
                console.log(`Monster 4 thisMonsterPosition: ${thisMonsterPosition}`);
                console.log(`Parameters passed to calculateTunedSpeed:`);
                console.log(`  teamSpeedLead: ${teamSpeedLead}`);
                console.log(`  boosterBaseSpeed: ${boosterBaseSpeed}`);
                console.log(`  boosterRuneSpeed: ${boosterRuneSpeed}`);
                console.log(`  iteration used: ${iterationValue}`);
                console.log(`  accumulatedAtbBoost: ${accumulatedAtbBoost}`);
                console.log(`  artiSpeed: ${artiSpeed}`);
                console.log(`  monster base speed: ${monster.speed}`);
                console.log(`  isSwift: ${isSwift}`);
                console.log(`  speedBuffActive: ${speedBuffActive}`);
                monster4tunedspeed = tunedSpeed;
                
                // Apply speed lead adjustment BEFORE combat speed calculation (like Monster 2)
                if (speedLeadPosition && 4 < speedLeadPosition) {
                    monster4tunedspeed += 1;
                }
                
                monster4rawspeed = (1.15 + teamSpeedLead/100) * monster.speed;
                console.log(`Monster 4 Raw Speed calculation: (1.15 + ${teamSpeedLead}/100) * ${monster.speed} = ${monster4rawspeed}`);
                console.log(`Monster 4 Combat Speed calculation: Math.ceil(${monster4tunedspeed} + ${monster4rawspeed}) = ${Math.ceil(monster4tunedspeed + monster4rawspeed)}`);
                monster4combatspeed = Math.ceil(monster4tunedspeed + monster4rawspeed);
                monster4basespeed = monster.speed;
                console.log(``);
                console.log(`monster4combatspeed: ${monster4combatspeed}`);
                console.log(`monster3combatspeed: ${monster3combatspeed}`);
                console.log(`monster2combatspeed: ${monster2combatspeed}`);
                boosterTick = Math.ceil(1 / (boosterCombatSpeed * getTickConstant()));
                monster4tfnumber = ((boosterTick + ((index) * (1 + SPDBoostConstant * (1 + miriamBonus + (artiSpeed / 100))))) * monster4combatspeed);
                console.log(`monster4tfnumber: ${monster4tfnumber}`);
                console.log(`monster3tfnumber: ${monster3tfnumber}`);
                console.log(`monster2tfnumber: ${monster2tfnumber}`);
                
                // Check for conflicts with previous monsters and adjust all that need it
                const conflictingMonsters = [];
                
                // Only adjust Monster 2 if it exists, is slower than Monster 4 (and hasn't been adjusted)
                if (monster2combatspeed != null && monster2combatspeed < monster4combatspeed && !adjustedMonsters.has(2)) {
                    conflictingMonsters.push({
                        position: 2,
                        card: monsterCards[1],
                        tfnumber: monster2tfnumber,
                        combatspeed: monster2combatspeed,
                        basespeed: monster2basespeed,
                        efftick: mon2efftick
                    });
                }
                
                // Only adjust Monster 3 if it exists, is slower than Monster 4 (and hasn't been adjusted)
                if (monster3combatspeed != null && monster3combatspeed < monster4combatspeed && !adjustedMonsters.has(3)) {
                    conflictingMonsters.push({
                        position: 3,
                        card: monsterCards[2],
                        tfnumber: monster3tfnumber,
                        combatspeed: monster3combatspeed,
                        basespeed: monster3basespeed,
                        efftick: mon3efftick
                    });
                }
                
                // Adjust each conflicting monster with minimal adjustment
                conflictingMonsters.forEach(conflictMonster => {
                    console.log(`Adjusting Monster ${conflictMonster.position} due to Monster 4 conflict`);
                    console.log(`Original conflicting monster combat speed: ${conflictMonster.combatspeed}`);
                    console.log(`Monster 4 combat speed: ${monster4combatspeed}`);
                    
                    // Adjust to match Monster 4's exact combat speed (for positional turn order)
                    // Get the conflict monster's element and check if it matches
                    const conflictMonsterCard = conflictMonster.card;
                    const conflictMonsterSelect = conflictMonsterCard.querySelector('select');
                    const isConflictMonster2A = conflictMonsterSelect.options[conflictMonsterSelect.selectedIndex].text.includes('(2A)');
                    const conflictMonsterDetails = getMonsterDetails(conflictMonsterSelect.value, isConflictMonster2A);
                    let conflictMonsterMatchingElementCheck = true;
                    if (hasElementRestriction && conflictMonsterDetails) {
                        conflictMonsterMatchingElementCheck = speedLeadElement === conflictMonsterDetails.element;
                    }
                    
                    // If element doesn't match, set teamSpeedLead to 0 for conflict monster calculation
                    const savedTeamSpeedLeadForConflict = teamSpeedLead;
                    if (!conflictMonsterMatchingElementCheck) {
                        teamSpeedLead = 0;
                    }
                    
                    const baseSpeedWithLead = (1.15 + teamSpeedLead/100) * conflictMonster.basespeed;
                    const requiredCombatSpeed = monster4combatspeed; // Same combat speed as Monster 4
                    let finalspeed = requiredCombatSpeed - Math.ceil(baseSpeedWithLead);
                    
                    // Remove +1 speed adjustment - keep speeds exactly the same
                    // if (speedLeadPosition && conflictMonster.position < speedLeadPosition) {
                    //     finalspeed += 1;
                    // }
                    if (finalspeed <= 0) {
                           finalspeed = 0; 
                        }
                    
                    // Update the actual combat speed variables for final turn order check
                    const adjustedCombatSpeed = Math.ceil(baseSpeedWithLead + finalspeed);
                    if (conflictMonster.position === 2) {
                        monster2combatspeed = adjustedCombatSpeed;
                    } else if (conflictMonster.position === 3) {
                        monster3combatspeed = adjustedCombatSpeed;
                    }
                    
                    console.log(`Exact match adjustment: Monster ${conflictMonster.position} needs ${finalspeed} speed (combat: ${adjustedCombatSpeed})`);
                    
                    if (isShowCombatSpeed && conflictMonster.position > 1) {
                        const totalCombatSpeed = Math.ceil(baseSpeedWithLead + finalspeed);
                        conflictMonster.card.querySelector('.combat-speed').textContent = `Combat Speed: ${totalCombatSpeed}`;  
                    } else {
                        if (conflictMonster.position === 1) {
                            conflictMonster.card.querySelector('.combat-speed').textContent = `Combat Speed: ${finalspeed}`;
                        } else {
                            conflictMonster.card.querySelector('.combat-speed').textContent = `Speed Needed: ${finalspeed}`;
                        }
                    }
                    
                    console.log(`Monster ${conflictMonster.position} adjusted to match Monster 4's combat speed: ${finalspeed}`);
                    
                    // Restore teamSpeedLead after conflict monster calculation
                    teamSpeedLead = savedTeamSpeedLeadForConflict;
                });
                
                // Set display for Monster 4 itself
                if (isShowCombatSpeed && thisMonsterPosition > 1) {
                    const baseSpeedWithLead = (1.15 + teamSpeedLead/100) * monster.speed;
                    const totalCombatSpeed = Math.ceil(baseSpeedWithLead + tunedSpeed);
                    card.querySelector('.combat-speed').textContent = `Combat Speed: ${totalCombatSpeed}`;
                } else {
                    if (thisMonsterPosition === 1) {
                        card.querySelector('.combat-speed').textContent = `Combat Speed: ${tunedSpeed}`;
                    } else {
                        card.querySelector('.combat-speed').textContent = `Speed Needed: ${tunedSpeed}`;
                    }
                }
                
                // Debug: Check final turn order
                console.log(`=== FINAL TURN ORDER CHECK ===`);
                console.log(`Booster Combat Speed: ${boosterCombatSpeed}`);
                console.log(`Monster 2 Combat Speed: ${monster2combatspeed}`);
                console.log(`Monster 3 Combat Speed: ${monster3combatspeed}`);
                console.log(`Monster 4 Combat Speed: ${monster4combatspeed}`);
                console.log(`Expected order: Booster ≥ M2 ≥ M3 ≥ M4`);
                console.log(`Actual order valid: ${boosterCombatSpeed >= (monster2combatspeed || 0) && (monster2combatspeed || 0) >= (monster3combatspeed || 0) && (monster3combatspeed || 0) >= monster4combatspeed}`);
                console.log(`===============================`);
            }
            if (tunedSpeed <= 0)
                {
                    tunedSpeed = 0;
                }
            
            // Skip display update if this monster was already adjusted (to prevent overwriting the adjusted display)
            // For Monster 2, check if it was adjusted due to booster conflict
            if (thisMonsterPosition === 2 && adjustedMonsters.has(2)) {
                // Display was already updated in the adjustment block, skip the normal update
            } else {
                if (isShowCombatSpeed && thisMonsterPosition > 1) {
                    const baseSpeedWithLead = (1.15 + teamSpeedLead/100) * monster.speed;
                    const totalCombatSpeed = Math.ceil(baseSpeedWithLead + tunedSpeed);
                    card.querySelector('.combat-speed').textContent = `Combat Speed: ${totalCombatSpeed}`;
                } else {
                    // For booster (position 1) always show "Combat Speed", for others check toggle
                    if (thisMonsterPosition === 1) {
                        card.querySelector('.combat-speed').textContent = `Combat Speed: ${tunedSpeed}`;
                    } else {
                        // This should never be reached since the toggle logic above handles it
                        card.querySelector('.combat-speed').textContent = `Speed Needed: ${tunedSpeed}`;
                    }
                }
            }
            
            // Restore original teamSpeedLead after this monster's calculations
            teamSpeedLead = savedTeamSpeedLead;
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
                // For speed buff (ID 5), only include if not self-only (same logic as ATB boost)
                // For ATB boost (ID 17), checkForAtbBoost already handles self_effect filtering
                if (effect.effect.id === 5 && !effect.self_effect) {
                    effectIds.push(effect.effect.id);
                } else if (effect.effect.id === 17) {
                    // ATB boost filtering is handled by checkForAtbBoost, but we need to check here too
                    // For consistency, we'll check self_effect here as well
                    const isYeonhong = boosterMonster.name === "Yeonhong";
                    if (isYeonhong || !effect.self_effect) {
                        effectIds.push(effect.effect.id);
                    }
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

function initializeTuningModeListeners() {
    const modeRadios = document.querySelectorAll('input[name="tuning-mode"]');
    
    modeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                handleTuningModeChange(this.value);
            }
        });
    });
    
    // Add combat speed toggle listener
    const combatSpeedToggle = document.getElementById('cmb-speed-toggle');
    if (combatSpeedToggle) {
        combatSpeedToggle.addEventListener('change', function() {
            console.log(`Combat speed display mode: ${this.checked ? 'Combat Speed' : 'Speed Needed'}`);
            recalculateTeamSpeeds();
            updateSpeedDisplayText();
        });
    }
    
    // Set initial state
    updateMonsterVisibility();
}

function resetCalculator() {
    // Reset all select elements to their default option
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        if (select.choicesInstance) {
            select.choicesInstance.setChoiceByValue('');
            // Trigger the change event to update monster displays
            select.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            select.selectedIndex = 0;
            select.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });
    
    // Reset all number inputs to 0
    const inputs = document.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
        input.value = 0;
    });
    
    // Reset all checkboxes to their default states
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        if (checkbox.id.includes('-swift')) {
            // Swift checkboxes should be checked by default
            checkbox.checked = true;
        } else {
            // All other checkboxes should be unchecked
            checkbox.checked = false;
        }
    });
    
    // Keep current tuning mode (don't reset it)
    // The mode should stay as whatever the user currently has selected
    
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
    
    // Remove focus from the reset button to prevent re-focusing
    document.activeElement.blur();
    
    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


document.addEventListener('DOMContentLoaded', function() {
    //fetchAndPopulateMonsters();
    fetchMonsters();
    fetchSkills();
    //populateMonsterOptions();
    initializeTurnOrderListeners();
    updateSpeedDisplayText();
    
    // Initialize tuning mode listeners
    initializeTuningModeListeners();
    
    const resetButton = document.getElementById('reset-button');
    if (resetButton) {
        resetButton.addEventListener('click', resetCalculator);
    }
    //calculateTurnOrder();
    //checkSpeedOrder();
});