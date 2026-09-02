module.exports = {
    id: "officerAngry",
    nextSceneId: "choicePath",               // «по умолчанию» если ни один вариант не задаёт свой переход
    background: "/assets/backgrounds/officer_angry_hall_bckg.png",
    character: {
        name: "Имперский офицер",
        image: "/assets/characters/officer_angry.png"
    },
    voice: "/assets/sounds/Scene7_officer_angry.wav",
    text: "Как вы смеете! Вы... вы... ШТУРМОВИКИ! АРЕСТУЙТЕ ИХ!",
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
            text: "Бежим до кофепоинта, а там решим куда дальше!",
            points: {
                ownTeam: 30,
                otherTeam: 10
            },
            nextSceneId: "choicePath",
            transitionText: "стратег"
        },
    
        {
            id: "joker",
            team: "joker",
            text: "Я требую занести в отчёт, что Империя не умеет стрелять!",
            points: {
                ownTeam: 30,
                otherTeam: 10
            },
            nextSceneId: "choicePath",
            transitionText: "шутник"
        },
    
        {
            id: "critic",
            team: "critic",
            text: "Теперь понимаю, почему штурмовиков называют *минорными багами*",
            points: {
                ownTeam: 30,
                otherTeam: 10
            },
            nextSceneId: "choicePath",
            transitionText: "критик"
        }
    ]
};
