module.exports = {
    id: "serverRoomDart2",
    nextSceneId: "serverRoomDart3",               // «по умолчанию» если ни один вариант не задаёт свой переход
    background: "/assets/backgrounds/serverRoomLight.png",
    voice: "/assets/sounds/Scene18_D_Vader_second_scene.wav",
    text: "Довольно разговоров. Приготовьтесь к своему последнему тесту! «Вейдер поднимает световой меч и делает выпад в вашу сторону. Времени уворачиваться нет — нужно выбрать защиту!»",
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
            text: "Анализирую траекторию удара! Если предугадаю движение — увернусь и контратакую!",
            points: {
                ownTeam: 30,
                otherTeam: 10
            },
            nextSceneId: "serverRoomDart3",
            transitionText: "ТЕКСТ"
        },
    
        {
            id: "joker",
            team: "joker",
            text: "Сразу видно, кто штурмовиков тренировал...",
            points: {
                ownTeam: 30,
                otherTeam: 10
            },
            nextSceneId: "serverRoomDart3",
            transitionText: "Текст2"
        },
    
        {
            id: "critic",
            team: "critic",
            text: "Твоё присутствие — баг! Сейчас пофиксим!",
            points: {
                ownTeam: 30,
                otherTeam: 10
            },
            nextSceneId: "serverRoomDart3",
            transitionText: "Текст3"
        }
    ]
};
