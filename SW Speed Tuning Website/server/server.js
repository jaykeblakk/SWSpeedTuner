const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());

app.get('/api/monsters', async (req, res) => {
    try {
        if (fs.existsSync('monsters.json')) {
            const monsterData = fs.readFileSync('monsters.json', 'utf8');
            res.json(JSON.parse(monsterData));
        } else {
            const monsters = await fetchAndSaveMonsters();
            res.json(monsters);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/skills', async (req, res) => {
    try {
        if (fs.existsSync('skills.json')) {
            const skillData = fs.readFileSync('skills.json', 'utf8');
            res.json(JSON.parse(skillData));
        } else {
            const skills = await fetchAndSaveSkills();
            res.json(skills);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

async function fetchAndSaveSkills() {
    let allSkills = [];
    let nextUrl = 'https://swarfarm.com/api/v2/skills/';

    while (nextUrl) {
        const response = await axios.get(nextUrl);
        allSkills = [...allSkills, ...response.data.results];
        nextUrl = response.data.next;
    }

    fs.writeFileSync('skills.json', JSON.stringify(allSkills, null, 2));
    return allSkills;
}

app.listen(3000, () => {
    console.log('Server running on port 3000');
});