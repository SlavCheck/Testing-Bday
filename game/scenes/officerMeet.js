module.exports = {
    id: "officerMeet",
    nextSceneId: "officerAngry",               // «по умолчанию» если ни один вариант не задаёт свой переход
    background: "/assets/backgrounds/hall_bckg.png",
    character: {
        name: "Имперский офицер",
        image: "/assets/characters/office_hello.png"
    },
    voice: "/assets/sounds/Scene6_office_start.wav",
    text: "Что вы здесь делаете, стажёры? У нас всё работает. Релиз выйдет вовремя. Не тратьте моё время. И вообще, у меня тут отчёт: Система стабильна, багов нет, всё готово к релизу. Подписано: Д. Вейдер",
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
            text: "Мы нашли баги в панели управления. Вот доказательства. Нужно их исправить до релиза",
            points: {
                ownTeam: 30,
                otherTeam: 10
            },
            nextSceneId: "officerAngry",
            transitionText: "стратег"
        },
    
        {
            id: "joker",
            team: "joker",
            text: "Д. Вейдер? А расшифровка Д — это Джуниор? Или Душнила?",
            points: {
                ownTeam: 30,
                otherTeam: 10
            },
            nextSceneId: "officerAngry",
            transitionText: "шутник"
        },
    
        {
            id: "critic",
            team: "critic",
            text: "А вы проверяли систему в режиме нагрузки? Или вы только отчёты умеете подписывать?",
            points: {
                ownTeam: 30,
                otherTeam: 10
            },
            nextSceneId: "officerAngry",
            transitionText: "критик"
        }
    ]
};
