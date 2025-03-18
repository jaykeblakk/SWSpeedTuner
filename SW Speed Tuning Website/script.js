
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
let monsterData = null;
let skillsData = null;
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
    const select = document.getElementById(id);
    const selectedValue = select.value;
    const is2A = select.options[select.selectedIndex].text.includes('(2A)');
    const cleanName = selectedValue;
    const selectedMonster = getMonsterDetails(cleanName, is2A);
    
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

/*function calculateTurnOrder() {
    const monsterIds = ['friendly1', 'friendly2', 'friendly3'];
    const monsterSpeeds = [];

    monsterIds.forEach(id => {
        const select = document.getElementById(id);
        const selectedMonster = getMonsterDetails(select.value);
        if (selectedMonster) {
            const baseSpeed = selectedMonster.base_speed;
            let speed = selectedMonster.base_speed;
            const runeSpeed = parseInt(document.getElementById(`${id}-rune-speed`).value) || 0;
            const atbBoost = parseInt(document.getElementById(`${id}-atb-boost`).value) || 0;

            const speedLead = getSpeedLead(monsterIds);

            // Speed lead calculation
            speed += baseSpeed * (speedLead / 100);

            // Tower bonus (15%)
            speed += baseSpeed * 0.15;

            // Add base speed and rune speed
            speed += baseSpeed + runeSpeed;

            monsterSpeeds.push({ 
                id, 
                name: selectedMonster.name, 
                speed, 
                image: selectedMonster.image,
                atbBoost
            });
        }
    });

    // Sort monsters by speed, considering ATB boost
    monsterSpeeds.sort((a, b) => {
        if (Math.floor(a.speed) === Math.floor(b.speed)) {
            return b.atbBoost - a.atbBoost;
        }
        return b.speed - a.speed;
    });

    // Display turn order
    const turnOrderList = document.getElementById('turn-order-list');
    turnOrderList.innerHTML = '';
    monsterSpeeds.forEach(monster => {
        const monsterElement = document.createElement('div');
        monsterElement.className = 'turn-order-monster';
        monsterElement.innerHTML = `
            <img src="${monster.image}" alt="${monster.name}">
            <div>${monster.name}</div>
            <div>Speed: ${Math.floor(monster.speed)}</div>
            <div>ATB Boost: ${monster.atbBoost}%</div>
        `;
        turnOrderList.appendChild(monsterElement);
    });
}*/

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

/*function checkSpeedOrder() {
    const teams = ['friendly'];
    
    teams.forEach(team => {
        for(let i = 2; i <= 3; i++) {
            const currentMonster = document.getElementById(`${team}${i}`);
            const previousMonster = document.getElementById(`${team}${i-1}`);
            
            const currentSpeed = calculateTotalSpeed(`${team}${i}`);
            const previousSpeed = calculateTotalSpeed(`${team}${i-1}`);
            
            // Remove existing warning if present
            const existingWarning = currentMonster.parentElement.querySelector('.speed-warning');
            if (existingWarning) {
                existingWarning.remove();
            }
            
            // Add warning if current monster is faster
            if (currentSpeed > previousSpeed && previousSpeed > 0) {
                const warning = document.createElement('div');
                warning.className = 'speed-warning';
                warning.textContent = 'Too fast for slot';
                currentMonster.parentElement.appendChild(warning);
            }
        }
    });
}*/

/*function calculateCombatSpeed(monsterId) {
    const monster = getMonsterDetails(document.getElementById(monsterId).value);
    if (!monster) return 0;
    
    const baseSpeed = monster.speed;
    const teamSpeedLead = getSpeedLead(['friendly1', 'friendly2', 'friendly3']);
    const speedLeadBonus = baseSpeed * (teamSpeedLead/100);
    const runeSpeed = parseInt(document.getElementById(`${monsterId}-rune-speed`).value) || 0;
    const swiftBonus = document.getElementById(`${monsterId}-swift`).checked ? baseSpeed * 0.15 : 0;
    
    // Tower bonus (15%) is always applied
    const towerBonus = baseSpeed * 0.15;
    
    return Math.ceil(baseSpeed + swiftBonus + towerBonus + speedLeadBonus + runeSpeed);
}*/

/*function updateCombatSpeed(id) { UPDATE COMBAT SPEED FUNCTION HERE
    const combatSpeed = calculateCombatSpeed(id);
    console.log(`Updating combat speed for ${id} to ${combatSpeed}`);
    document.getElementById(`${id}-combat-speed`).textContent = `Combat Speed: ${combatSpeed}`;
}*/

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

/*function calculateTunedSpeed2(id) {
    //L, B_B, R_B, T, i, S_Boost, A_i, B_i, applyModifier = true
    const selectedMonster = getMonsterDetails(select.value);
    const speedModifier = 1 + 0.3 * (1 + A_i / 100);
    
    const numerator = Math.ceil(
        Math.ceil((1.4 + L / 100) * B_B + R_B) * T *
        (Math.ceil(1 / Math.ceil((1.4 + L / 100) * B_B + R_B) * T) + i)
    ) - S_Boost / 100;

    const denominator = T * (
        Math.ceil(1 / Math.ceil((1.4 + L / 100) * B_B + R_B) * T) + 
        i * (applyModifier ? speedModifier : 1)
    );

    return Math.ceil(numerator / denominator) - B_i * (1.4 + L / 100);
}*/

/*function calculateTunedSpeed(monsterId) {
    const monster = getMonsterDetails(document.getElementById(monsterId).value);
    if (!monster) return 0;
    
    const baseSpeed = monster.speed;
    const leadSkill = getSpeedLead(['friendly1', 'friendly2', 'friendly3']);
    const baseBooster = baseSpeed;
    const runeSpeed = parseInt(document.getElementById(`${monsterId}-rune-speed`).value) || 0;
    const atbBoost = parseInt(document.getElementById(`${monsterId}-atb-boost`).value) || 0;
    const artiSpeed = parseFloat(document.getElementById(`${monsterId}-artifact-speed`).value) || 0;
    
    // Default values for other parameters
    const tickConstant = 0.07;  // This is a game constant
    const iteration = 1;        // Can be adjusted based on turn order
    
    return calculateTunedSpeed(
        leadSkill,
        baseBooster,
        runeSpeed,
        tickConstant,
        iteration,
        atbBoost,
        artiSpeed,
        baseSpeed
    );
}*/

/*function calculateCombatSpeed(monsterId) {
    const monster = getMonsterDetails(document.getElementById(monsterId).value);
    if (!monster) return 0;
    
    const baseSpeed = monster.speed;
    const teamSpeedLead = getSpeedLead(['friendly1', 'friendly2', 'friendly3']);
    const runeSpeed = parseInt(document.getElementById(`${monsterId}-rune-speed`).value) || 0;
    const atbBoost = parseInt(document.getElementById(`${monsterId}-atb-boost`).value) || 0;
    const artiSpeed = parseFloat(document.getElementById(`${monsterId}-artifact-speed`).value) || 0;
    
    // Get monster number from ID (1, 2, or 3)
    const monsterNumber = parseInt(monsterId.slice(-1));
    
    const tunedSpeed = calculateTunedSpeed(
        teamSpeedLead,
        baseSpeed,
        runeSpeed,
        0.07,
        monsterNumber, // iteration increases with each monster
        atbBoost,
        artiSpeed,
        baseSpeed
    );
    
    return Math.ceil(tunedSpeed);
}*/

/*function calculateTunedSpeed(leadSkill, baseBooster, runeSpeedBooster, tickConstant, iteration, atbBoostSum, artiSpeedSum, baseSpeed, applyModifier = true) {
    const speedModifier = 1 + 0.3 * (1 + artiSpeedSum / 100);
    
    const numerator = Math.ceil((1.15 + leadSkill / 100) * baseBooster + runeSpeedBooster) * tickConstant * (Math.ceil(1 / Math.ceil((1.15 + leadSkill / 100) * baseBooster + runeSpeedBooster) * tickConstant)) + iteration - atbBoostSum / 100;
    const firstcalc = ((1.15 + leadSkill / 100) * baseBooster + runeSpeedBooster) * tickConstant;
    const secondcalc = Math.ceil(1 / Math.ceil((1.15 + leadSkill / 100) * baseBooster + runeSpeedBooster) * tickConstant) + iteration;

    const denominator = tickConstant * (Math.ceil(1 / (Math.ceil((1.15 + leadSkill / 100) * baseBooster + runeSpeedBooster) * tickConstant)) + iteration * (applyModifier ? speedModifier : 1));
    if (iteration === 1){
        console.log(``);
        console.log(`Galleon`);   
    }
    else if (iteration === 2)
    {
        console.log(``);
        console.log(`Julie`);
    }
    console.log(`First Calculation: ${firstcalc}`);
    console.log(`Second Calculation: ${secondcalc}`);
    console.log(`Numerator: ${numerator}`);
    console.log(`Denominator: ${denominator}`);
    console.log(`Speed Boost: ${atbBoostSum / 100}`);
    return Math.ceil((numerator / denominator) - baseSpeed * (1.15 + leadSkill / 100));
}*/

function calculateTunedSpeed(leadSkill, baseBooster, runeSpeedBooster, tickConstant, iteration, atbBoostSum, artiSpeedSum, baseSpeed, applyModifier = true) {
    const speedModifier = 1 + 0.3 * (1 + artiSpeedSum / 100);
    const atbPerTick = Math.ceil((1.15 + leadSkill / 100) * baseBooster + runeSpeedBooster);
    const numerator = atbPerTick * tickConstant * (Math.ceil(1/(atbPerTick * tickConstant)) + iteration) - atbBoostSum/100;
    const denominator = tickConstant * (Math.ceil(1/(atbPerTick * tickConstant)) + iteration * (applyModifier ? speedModifier : 1));
    return Math.ceil(Math.floor((numerator / denominator)) + 0.0001 - baseSpeed * (1.15 + leadSkill / 100));
}

function recalculateTeamSpeeds() {
    const monsterCards = Array.from(document.querySelectorAll('.monster'));
    const teamSpeedLead = getSpeedLead(['friendly1', 'friendly2', 'friendly3']);
    
    // Get booster's stats
    const boosterCard = monsterCards[0];
    const boosterId = boosterCard.querySelector('select').id;
    const boosterMonster = getMonsterDetails(document.getElementById(boosterId).value);
    const boosterBaseSpeed = boosterMonster ? boosterMonster.speed : 0;
    const boosterRuneSpeed = parseInt(document.getElementById(`${boosterId}-rune-speed`).value) || 0;
    const boosterAtbBoost = parseFloat(document.getElementById(`${boosterId}-atb-boost`).value) || 0;
    
    // Simple booster speed calculation
    const boosterCombatSpeed = Math.ceil((1.15 + teamSpeedLead/100) * boosterBaseSpeed + boosterRuneSpeed);
    boosterCard.querySelector('.combat-speed').textContent = `Combat Speed: ${boosterCombatSpeed}`;
    
    const boosterEffects = getBoosterEffectTypes(boosterId);
    applyModifier = false;
    if (boosterEffects.includes(5)){
        applyModifier = true;
    }
    else{
        applyModifier = false;
    }
    //if (boosterEffects.includes(17) && !(boosterEffects.includes(5))){
      /*  const lastMonsterCard = monsterCards[monsterCards.length - 1];
        const lastMonsterId = lastMonsterCard.querySelector('select').id;
        const lastMonsterArtiSpeed = parseFloat(document.getElementById(`${lastMonsterId}-artifact-speed`).value) || 0;
        const lastMonster = getMonsterDetails(document.getElementById(lastMonsterId).value);
        const lastMonsterRawSpeed = Math.ceil((1.15 + teamSpeedLead/100) * lastMonster.speed);
        const lastMonsterTuning = calculateTunedSpeed(teamSpeedLead, boosterBaseSpeed, boosterRuneSpeed, 0.0007, (monsterCards.length - 1), boosterAtbBoost, lastMonsterArtiSpeed, lastMonster.speed, applyModifier);
        const lastMonsterCombatSpeed = lastMonsterTuning + lastMonsterRawSpeed;
        const secondMonsterCombatSpeed = lastMonsterCombatSpeed + 1;
        const secondMonsterCard = monsterCards[1];
        const secondMonsterId = secondMonsterCard.querySelector('select').id;
        const secondMonster = getMonsterDetails(document.getElementById(secondMonsterId).value);
        const secondMonsterRawSpeed = Math.ceil((1.15 + teamSpeedLead/100) * secondMonster.speed);
        const secondMonsterTunedSpeed = secondMonsterCombatSpeed - secondMonsterRawSpeed;
        lastMonsterCard.querySelector('.combat-speed').textContent = `Speed Needed: ${lastMonsterTuning}`;
        secondMonsterCard.querySelector('.combat-speed').textContent = `Speed Needed: ${secondMonsterTunedSpeed}`;*/
    //}
    //else{
        // Calculate tuned speeds for followers using booster's ATB boost
        monster2tunedspeed = null;
        monster3tunedspeed = null;
        monster2combatspeed = null;
        monster3combatspeed = null;
        monster2tfnumber = null;
        monster3tfnumber = null;
        monster2basespeed = null;
        mon2efftick = null;
        monsterCards.slice(1).forEach((card, index) => {
            const monsterId = card.querySelector('select').id;
            const monster = getMonsterDetails(document.getElementById(monsterId).value);
            if (!monster) return;
            const artiSpeed = parseFloat(document.getElementById(`${monsterId}-artifact-speed`).value) || 0;
            const tunedSpeed = calculateTunedSpeed(
                teamSpeedLead,
                boosterBaseSpeed,
                boosterRuneSpeed,
                0.0007,
                index + 1,
                boosterAtbBoost,  // Using booster's ATB boost here
                artiSpeed,
                monster.speed,
                applyModifier
            );
            if (index == 0)
                {
                    // Calculating Galleon's speed
                    monster2tunedspeed = tunedSpeed;
                    monster2rawspeed = (1.15 + teamSpeedLead/100) * monster.speed;
                    monster2combatspeed = monster2tunedspeed + monster2rawspeed;
                    console.log(`Mon 2 Combat Speed: ${monster2combatspeed}`);
                    boosterTick = Math.ceil(1 / (boosterCombatSpeed * 0.0007));
                    mon2efftick = boosterTick + ((index + 1) * (1 + 0.3 * (1 + (artiSpeed / 100))));
                    console.log(`Mon 2 Effective Tick: ${mon2efftick}`);
                    monster2tfnumber = ((boosterTick + ((index + 1) * (1 + 0.3 * (1 + (artiSpeed / 100))))) * monster2combatspeed);
                    console.log(`Mon 2 tuned speed: ${tunedSpeed}`);
                    console.log(`Mon 2 T/F check number: ${monster2tfnumber}`);
                    monster2basespeed = monster.speed;
                }
            if (index === 1)
                {
                    //Calculating Julie's Speed
                    monster3tunedspeed = tunedSpeed;
                    monster3rawspeed = (1.15 + teamSpeedLead/100) * monster.speed;
                    monster3combatspeed = monster3tunedspeed + monster3rawspeed;
                    console.log(`Mon 3 Combat Speed: ${monster3combatspeed}`);
                    boosterTick = Math.ceil(1 / (boosterCombatSpeed * 0.0007));
                    monster3tfnumber = ((boosterTick + ((index) * (1 + 0.3 * (1 + (artiSpeed / 100))))) * monster3combatspeed);
                    effectivetick = boosterTick + ((index) * (1 + 0.3 * (1 + (artiSpeed / 100))));
                    console.log(`Mon 3 Effective Tick: ${effectivetick}`);
                        if (monster3tfnumber > monster2tfnumber)
                            {
                                monster2newspeed = Math.ceil(((monster3tfnumber) / (mon2efftick)) - (1.15 + teamSpeedLead / 100) * monster2basespeed);
                                console.log(`Mon 3 T/F check number: ${monster3tfnumber}`);
                                console.log(`Mon 2 + Speed needed: ${monster2newspeed}`);
                                console.log(``);
                                
                                monster2newspeeddiff = monster2newspeed - monster2tunedspeed;
                                monster2newtunedspeed = monster2tunedspeed + monster2newspeeddiff;
                                const secondMonCard = monsterCards[1];
                                secondMonCard.querySelector('.combat-speed').textContent = `Speed Needed: ${monster2newtunedspeed}`;
                            }
                }
            
            card.querySelector('.combat-speed').textContent = `Speed Needed: ${tunedSpeed}`;
        });
    //Checking to see if galleon's combat speed is lower than Julies. If so, we perform the math below to give Galleon the correct speed to make him 1 faster than Julie.
   // }
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