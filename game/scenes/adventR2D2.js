module.exports = {
    id: "adventR2D2",
    nextSceneId: "helpR2D2",               // «по умолчанию» если ни один вариант не задаёт свой переход
    background: "/assets/backgrounds/serverDoorR2D2.png",
    character: {
        name: "R2-D2",
        image: "/assets/characters/R3D3_portr_error.png"
    },
    voice: "/assets/sounds/Scene12_advent_R3D3.wav",
    text: "Бип-буп-бип! Бип!» (перевод: «Помогите! У меня баг в системе! Я не могу подключиться к сети!»",
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
            text: "Конечно, поможем! Мы же тестировщики. Это наш долг",
            points: {
                ownTeam: 30,
                otherTeam: 10
            },
            nextSceneId: "helpR2D2",
            transitionText: "ТЕКСТ"
        },
    
        {
            id: "joker",
            team: "joker",
            text: "Извини, приятель. У нас миссия. Нам нужно к Вейдеру",
            points: {
                ownTeam: 10,
                otherTeam: 5
            },
            nextSceneId: "helpR2D2",
            transitionText: "Текст2"
        },
    
        {
            id: "critic",
            team: "critic",
            text: "Сам разберёшься. У нас свои проблемы",
            points: {
                ownTeam: 10,
                otherTeam: 5
            },
            nextSceneId: "helpR2D2",
            transitionText: "Текст3"
        }
    ]
};
