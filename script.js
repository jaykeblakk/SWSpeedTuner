/*function fetchAndPopulateMonsters() {
    const config = {
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    };

    axios.get('https://localhost:3000/api/v2/skills/', config)
        .then(response => {
            console.log('Full API Response:', response);
            console.log('Skills:', response.data);
            populateDropdowns(response.data);
        })
        .catch(error => {
            console.log('Error:', error);
        });
}

function populateDropdowns(monsters) {
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        // Clear existing options except the default "Select Monster" option
        select.innerHTML = '<option value="">Select Monster</option>';

        // Add new options from the fetched data
        monsters.forEach(monster => {
            const option = document.createElement('option');
            option.value = monster.id;
            option.textContent = monster.name;
            select.appendChild(option);
        });
    });
}*/

// Populate monster options
/*function populateMonsterOptions() {
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        for (const [key, monster] of Object.entries(monsters)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = monster.name;
            select.appendChild(option);
        }
    });
}*/
//ABOVE CODE IS NEEDED TO UPDATE MONSTER INFORMATION WHEN NEW MONSTERS ARE RELEASED. DO NOT DELETE.
let monsterData = null;
let skillsData = null;
let SPDBoostConstant = 0.3;
let kroaBoostTarget = 2;

function checkForMiriam() {
    const monsterCards = Array.from(document.querySelectorAll('.monster'));
    const hasMiriam = monsterCards.some(card => {
        const monsterId = card.querySelector('select').id;
        const monster = getMonsterDetails(document.getElementById(monsterId).value);
        return monster && monster.name === "Miriam";
    });
    
    SPDBoostConstant = hasMiriam ? 0.405 : 0.3;
}
// Load the JSON data
fetch('./monsters.json')
    .then(response => response.json())
    .then(data => {
        monsterData = data;
        populateDropdowns(data);
    });

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
            .slice(60)
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
            window.monsterData = monsters;
            populateDropdowns(monsters);
        });
}

function updateMonster(id) {
    checkForMiriam();
    const select = document.getElementById(id);
    const selectedValue = select.value;
    const is2A = select.options[select.selectedIndex].text.includes('(2A)');
    const cleanName = selectedValue;
    const selectedMonster = getMonsterDetails(cleanName, is2A);
    const kroaTargetDiv = document.getElementById('kroa-boost-target');
    if (id === 'friendly1') {  // If we're updating the booster
        if (selectedMonster.name === 'Kroa') {
            kroaTargetDiv.style.display = 'block';
            document.querySelectorAll('input[name="kroa-target"]').forEach(radio => {
                radio.addEventListener('change', (e) => {
                    kroaBoostTarget = parseInt(e.target.value);
                    recalculateTeamSpeeds();
                    updateSpeedDisplayText();
                });
            });
        } else {
            // Only hide if we're selecting a non-Kroa booster
            kroaTargetDiv.style.display = 'none';
            kroaBoostTarget = 2;
        }
    } else {
        // For non-booster positions, check if this card is Kroa
        if (selectedMonster.name === 'Kroa') {
            kroaTargetDiv.style.display = 'block';
        }
    }
    if (selectedMonster) {
        // Update name and speed
        document.getElementById(`${id}-name`).textContent = selectedMonster.name;
        document.getElementById(`${id}-speed`).textContent = selectedMonster.speed;
        
        // Set monster image based on awakening status
    if (selectedMonster) {
        document.getElementById(`${id}-name`).textContent = selectedMonster.name;
        document.getElementById(`${id}-speed`).textContent = selectedMonster.speed;

        if (selectedMonster.image_filename) {
            const monsterImage = document.getElementById(`${id}-image`);
            monsterImage.src = `./icons/${selectedMonster.image_filename}`;
        }
    }

        // Handle speed leader skill
        const speedLeadContainer = document.getElementById(`${id}-speedlead-container`);
        const speedLeadValue = document.getElementById(`${id}-speedlead-value`);
        
        // Check for ATB boost skills
        document.getElementById(`${id}-atb-boost`).value = 0;
        const hasAtbBoost = checkForAtbBoost(selectedMonster.skills);
        const atbBoostContainer = document.getElementById(`${id}-atb-boost-container`);
        atbBoostContainer.style.display = hasAtbBoost ? 'block' : 'none';
        
        if (selectedMonster.leader_skill && selectedMonster.leader_skill.attribute === "Attack Speed") {
            speedLeadContainer.style.display = 'block';
            speedLeadValue.textContent = selectedMonster.leader_skill.amount;
        } else {
            speedLeadContainer.style.display = 'none';
        }
        
        const hasSpeedBuff = selectedMonster.skills.some(skillId => {
            const skill = skillsData.find(s => s.id === skillId);
            return skill && skill.effects.some(effect => effect.effect.id === 17);
        });

        // Get all artifact speed inputs and containers
        const artifactInputs = document.querySelectorAll('.artifact-speed input');
        const artifactContainers = document.querySelectorAll('.artifact-speed');

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
    
    //calculateTurnOrder();
    recalculateTeamSpeeds();
    updateSpeedDisplayText();
    //checkSpeedOrder();
}
}

function checkForAtbBoost(skillIds) {
    return skillIds.some(skillId => {
        const skill = skillsData.find(s => s.id === skillId);
        return skill && skill.effects.some(effect => effect.effect.name === "Increase ATB");
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

function initializeDraggableCards() {
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
            
            // Reset positions and reorder
            cardsInRow.forEach((c, index) => {
                c.style.left = '0px';
                c.style.zIndex = '1';
                row.appendChild(c);
            });
            recalculateTeamSpeeds();
            updateSpeedDisplayText();
        }
    });
    recalculateTeamSpeeds();
    updateSpeedDisplayText();
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

function getAccumulatedAtbBoost(currentIndex) {
    let totalBoost = 0;
    for(let i = 0; i <= currentIndex; i++) {
        const monsterBoost = parseFloat(document.getElementById(`friendly${i+1}-atb-boost`).value) || 0;
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
        const monster = getMonsterDetails(document.getElementById(monsterId).value);
        const hasSpeedBuff = monster.skills.some(skillId => {
            const skill = skillsData.find(s => s.id === skillId);
            return skill && skill.effects.some(effect => effect.effect.id === 5);
        });
        const atbBoost = parseFloat(document.getElementById(`${monsterId}-atb-boost`).value) || 0;
        
        effects.push({
            position: index,
            hasSpeedBuff,
            atbBoost
        });
    });
    
    return effects;
}

function calculateTunedSpeed(leadSkill, baseBooster, runeSpeedBooster, tickConstant, iteration, atbBoostSum, artiSpeedSum, baseSpeed, isSwift = true, applyModifier = true) {
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
    const atbPerTick = Math.ceil((1.15 + leadSkill / 100) * baseBooster + runeSpeedBooster);
    console.log(`Booster Combat Speed: ${atbPerTick}`);
    const numerator = atbPerTick * tickConstant * (Math.ceil(1/(atbPerTick * tickConstant)) + iteration) - atbBoostSum/100;
    console.log(`Numerator: ${numerator}`);
    const denominator = tickConstant * (Math.ceil(1/(atbPerTick * tickConstant)) + iteration * (applyModifier ? speedModifier : 1));
    console.log(`Denominator: ${denominator}`);
    const result = numerator / denominator;
    let speedResult = result - baseSpeed * (1.15 + leadSkill / 100);
    let swiftAdjustment = false;
    if (isSwift)
    {
        let swiftnum = speedResult % 1;
        let nonswiftnum = (baseSpeed % 4) / 4;
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
    const boosterMonster = getMonsterDetails(document.getElementById(boosterId).value);
    let boosterBaseSpeed = boosterMonster ? boosterMonster.speed : 0;
    const boosterRuneSpeed = parseInt(document.getElementById(`${boosterId}-rune-speed`).value) || 0;
    const boosterAtbBoost = parseFloat(document.getElementById(`${boosterId}-atb-boost`).value) || 0;
    let isKroa = false;
    
    // Simple booster speed calculation
    let boosterCombatSpeed = Math.ceil((1.15 + teamSpeedLead/100) * boosterBaseSpeed + boosterRuneSpeed);
    if (boosterMonster.name === "Chilling")
        {
            boosterCombatSpeed = boosterCombatSpeed + 40;
        }
    if (boosterMonster.name === "Kroa")
        {
            isKroa = true;
        }
    boosterCard.querySelector('.combat-speed').textContent = `Combat Speed: ${boosterCombatSpeed}`;
    
    const boosterEffects = getBoosterEffectTypes(boosterId);
    applyModifier = false;
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
    const effectsByPosition = getEffectsByPosition();
    const firstSpeedBuffPosition = effectsByPosition.findIndex(e => e.hasSpeedBuff);
        monsterCards.slice(1).forEach((card, index) => {
            const monsterId = card.querySelector('select').id;
            const monster = getMonsterDetails(document.getElementById(monsterId).value);
            if (!monster) return;
            const artiSpeed = parseFloat(document.getElementById(`${monsterId}-artifact-speed`).value) || 0;
            const currentPosition = index + 1;
            const speedBuffActive = firstSpeedBuffPosition !== -1 && currentPosition >= firstSpeedBuffPosition;
            let accumulatedAtbBoost = getAccumulatedAtbBoost(index);
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
                speedBuffActive
                );
                card.querySelector('.combat-speed').textContent = `Speed Needed: ${tunedSpeed}`;
            }
            else{
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
                    speedBuffActive
                );
                if (index == 0)
                    {
                        // Calculating Galleon's speed
                        monster2tunedspeed = tunedSpeed;
                        monster2rawspeed = (1.15 + teamSpeedLead/100) * monster.speed;
                        monster2combatspeed = monster2tunedspeed + monster2rawspeed;
                        boosterTick = Math.ceil(1 / (boosterCombatSpeed * 0.0007));
                        mon2efftick = boosterTick + ((index + 1) * (1 + SPDBoostConstant * (1 + (artiSpeed / 100))));
                        monster2tfnumber = ((boosterTick + ((index + 1) * (1 + SPDBoostConstant * (1 + (artiSpeed / 100))))) * monster2combatspeed);
                        monster2basespeed = monster.speed;
                    }
                if (index === 1)
                    {
                        //Calculating Julie's Speed
                        monster3tunedspeed = tunedSpeed;
                        monster3rawspeed = (1.15 + teamSpeedLead/100) * monster.speed;
                        monster3combatspeed = monster3tunedspeed + monster3rawspeed;
                        boosterTick = Math.ceil(1 / (boosterCombatSpeed * 0.0007));
                        monster3tfnumber = ((boosterTick + ((index) * (1 + SPDBoostConstant * (1 + (artiSpeed / 100))))) * monster3combatspeed);
                        effectivetick = boosterTick + ((index) * (1 + SPDBoostConstant * (1 + (artiSpeed / 100))));
                            if (monster3tfnumber > monster2tfnumber)
                                {
                                    monster2newspeed = Math.ceil(((monster3tfnumber) / (mon2efftick)) - (1.15 + teamSpeedLead / 100) * monster2basespeed);
                                    monster2newspeeddiff = monster2newspeed - monster2tunedspeed;
                                    monster2newtunedspeed = monster2tunedspeed + monster2newspeeddiff;
                                    const secondMonCard = monsterCards[1];
                                    secondMonCard.querySelector('.combat-speed').textContent = `Speed Needed: ${monster2newtunedspeed}`;
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

document.addEventListener('DOMContentLoaded', function() {
    fetchAndPopulateMonsters();
    fetchSkills();
    //populateMonsterOptions();
    initializeTurnOrderListeners();
    updateSpeedDisplayText();
    //calculateTurnOrder();
    //checkSpeedOrder();
});