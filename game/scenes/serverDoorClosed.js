module.exports = {
    id: "serverDoorClosed",
    nextSceneId: "serverRoom",               // «по умолчанию» если ни один вариант не задаёт свой переход
    background: "/assets/backgrounds/serverDoor.png",
    voice: "/assets/sounds/Scene15_enter_the_password.wav",
    text: "Вы подходите к двери серверной. Она закрыта. На панели — надпись: «ВВЕДИТЕ ПАРОЛЬ». Никаких подсказок. Только пустой экран и мигающий курсор",
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
            text: "Может, пароль — это «🚪Дверь»?",
            points: {
                ownTeam: 5,
                otherTeam: 5
            },
            nextSceneId: "serverRoom",
            transitionText: "ТЕКСТ"
        },
    
        {
            id: "joker",
            team: "joker",
            text: "Может, пароль — это «🪟Окно»?",
            points: {
                ownTeam: 5,
                otherTeam: 5
            },
            nextSceneId: "serverRoom",
            transitionText: "Текст2"
        },
    
        {
            id: "critic",
            team: "critic",
            text: "Может, пароль — это «🕳️Люк»?",
            points: {
                ownTeam: 50,
                otherTeam: 50
            },
            nextSceneId: "serverRoom",
            transitionText: "Текст3"
        }
    ]
};
