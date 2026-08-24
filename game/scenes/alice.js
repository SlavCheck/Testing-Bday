module.exports = {

    id: "alice",

    background:
        "/assets/backgrounds/office_bckg.png",

    character: {
        name: "Алиса",
        image:
            "/assets/characters/alice_portr.png"
    },

    voice:
        "/assets/sounds/Scene4_Alice_hello.wav",

    text:
        "Привет, экипаж! Я слышала, вы ищете баги. Я могу помочь. Но помните: я — не просто голосовой помощник. Я — душа этого офиса. Если найдёте баг во мне — говорите сразу. Я не обижусь. Наверное. Серверная в конце коридора. Но будьте осторожны: Империя расставила ловушки. Штурмовики повсюду. Идите за мной!",

    voting: {
        enabled: true,
        duration: 30,
        tieBreak: "revote",
        revoteDuration: 15
    },

    choices: [

        {
            id: "strategist",
            team: "strategist",

            text:
                "Алиса, покажи нам панель управления умным домом. Нужно проверить устройства перед тем, как идти в серверную",

            points: {
                ownTeam: 30,
                otherTeam: 10
            },

            nextSceneId: "path"
        },

        {
            id: "joker",
            team: "joker",

            text:
                "Алиса, а спой нам что-нибудь! Нам нужна боевая песня!",

            points: {
                ownTeam: 30,
                otherTeam: 10
            },

            nextSceneId: "path"
        },

        {
            id: "critic",
            team: "critic",

            text:
                "Алиса, а ты вообще знаешь, где находится серверная? Или ты только умеешь включать музыку?",

            points: {
                ownTeam: 30,
                otherTeam: 10
            },

            nextSceneId: "path"
        }

    ]

};