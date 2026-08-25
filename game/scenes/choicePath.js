module.exports = {
    id: "choicePath",
    nextSceneId: "diningRoom",               // «по умолчанию» если ни один вариант не задаёт свой переход
    background: "/assets/backgrounds/hall_choice_bckg.png",
    voice: "/assets/sounds/Scene8_choice_path.wav",
    text: "Вы стоите на перекрёстке. Три пути: 1. Налево — столовая / 2. Прямо — комната умных устройств / 3. Направо — серверная",
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
            text: "Идём в серверную. Нужно встретиться с Вейдером лицом к лицу",
            points: {
                ownTeam: 10,
                otherTeam: 5
            },
            nextSceneId: "diningRoom",
            transitionText: "Увы, в серверную пока нельзя"
        },
    
        {
            id: "joker",
            team: "joker",
            text: "Сначала в столовую! Чубакка там, и он делает лучший кофе в галактике",
            points: {
                ownTeam: 30,
                otherTeam: 10
            },
            nextSceneId: "diningRoom",
            transitionText: "Отлично! Чубакка заждался нас!"
        },
    
        {
            id: "critic",
            team: "critic",
            text: "В комнату умных устройств. Нужно проверить всё до того, как встретимся с Вейдером",
            points: {
                ownTeam: 10,
                otherTeam: 5
            },
            nextSceneId: "diningRoom",
            transitionText: "Ну какая ещё комната умных устройств? День надо начинать с кофе, а работа подождёт! Идём к Чубакке!"
        }
    ]
};
