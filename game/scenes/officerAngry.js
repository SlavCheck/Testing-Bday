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
            text: "Бежим! Нам нужно добраться до перекрёстка и решить, куда идти дальше!",
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
            text: "Бежим! И, кстати, я теперь понимаю, почему штурмовиков называют *минорными багами* — они всегда промахиваются!",
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
            text: "Бежим! Но я требую занести в протокол, что Империя не умеет стрелять!",
            points: {
                ownTeam: 30,
                otherTeam: 10
            },
            nextSceneId: "choicePath",
            transitionText: "критик"
        }
    ]
};
