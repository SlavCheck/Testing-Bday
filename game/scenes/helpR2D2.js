module.exports = {
    id: "helpR2D2",
    nextSceneId: "thanksFromR2D2",               // «по умолчанию» если ни один вариант не задаёт свой переход
    background: "/assets/backgrounds/serverDoorR2D2.png",
    character: {
        name: "R2-D2",
        image: "/assets/characters/R3D3_portr_error.png"
    },
    voice: "/assets/sounds/Scene13_r3d3_first_scene.wav",
    text: " Бип-буп! (перевод: «Спасибо! У меня какой-то сбой в навигационном модуле. Он думает, что я на Татуине, и пытается построить маршрут через пустыню»)",
    voting: {
        enabled: true,
        duration: 35,
        tieBreak: "revote",
        revoteDuration: 15
    },
    transition: {
        title: "Заголовок",
        text: "Текст"
    },
    choices: [
        {
            id: "strategist",
            team: "strategist",
            text: "Провести дымовое тестирование",
            points: {
                ownTeam: 15,
                otherTeam: 15
            },
            nextSceneId: "diningRoom2",
            transitionText: "ТЕКСТ"
        },
    
        {
            id: "joker",
            team: "joker",
            text: "Провести санитарное тестирование",
            points: {
                ownTeam: 30,
                otherTeam: 30
            },
            nextSceneId: "diningRoom2",
            transitionText: "Текст2"
        },
    
        {
            id: "critic",
            team: "critic",
            text: "Провести регрессионное тестирование",
            points: {
                ownTeam: 5,
                otherTeam: 5
            },
            nextSceneId: "diningRoom2",
            transitionText: "Текст3"
        }
    ]
};
