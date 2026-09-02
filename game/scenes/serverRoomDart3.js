module.exports = {
    id: "serverRoomDart3",
    nextSceneId: "finalScene",               // «по умолчанию» если ни один вариант не задаёт свой переход
    background: "/assets/backgrounds/serverRoomLight.png",
    voice: "/assets/sounds/Scene19_D_Vader_last_scene.wav",
    text: "Вы... вы сильнее, чем я думал. Но этого недостаточно!",
    character: {
        name: "Дарт Вейдер",
        image: "/assets/characters/DV_portr.png"
    },
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
            text: "Пролить кофе/чай на ноутбук Вейдера",
            points: {
                ownTeam: 30,
                otherTeam: 10
            },
            nextSceneId: "finalScene",
            transitionText: "ТЕКСТ"
        },
    
        {
            id: "joker",
            team: "joker",
            text: "Столько шума от тебя, а баг-репорт получится короткий",
            points: {
                ownTeam: 30,
                otherTeam: 10
            },
            nextSceneId: "finalScene",
            transitionText: "Текст2"
        },
    
        {
            id: "critic",
            team: "critic",
            text: "Пора провести нагрузочное тестирование твоему костюму",
            points: {
                ownTeam: 30,
                otherTeam: 10
            },
            nextSceneId: "finalScene",
            transitionText: "Текст3"
        }
    ]
};
