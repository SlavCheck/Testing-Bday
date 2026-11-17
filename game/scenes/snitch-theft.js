"use strict";
// The answer is private and validated in server.js.
module.exports = {
    id: "snitch-theft",
    type: "snitch_mystery",
    title: "Кто украл Золотой Снитч?",
    duration: 90,
    text: "Золотой Снитч пропал из запертой комнаты между 14:00 и 15:00. Дверь была заперта, а окно открыто.",
    clues: [
        "Кража произошла между 14:00 и 15:00.",
        "Дверь комнаты была заперта.",
        "Окно комнаты было открыто."
    ],
    dialogues: [
        { name: "Гарри", image: "/assets/characters/NewYearsCH/Harry.png", text: "С 14:00 до 14:30 я был в Выручай-комнате. Репетировал заклинание. В 14:30 вышел и встретил Драко в коридоре рядом с библиотекой. Мы разговаривали минут десять, потом я пошел на поле" },
        { name: "Гермиона", image: "/assets/characters/NewYearsCH/Hermione.png", text: "С 14:00 до 14:45 я была в библиотеке. В 14:45 пошла искать Рона. Заглянула в Выручай-комнату в 14:50 — там никого не было. Потом пошла в подземелья" },
        { name: "Драко", image: "/assets/characters/NewYearsCH/Malfoy.png", text: "С 14:00 до 14:30 я был в подземельях у Слизерина. В 14:30 поднялся наверх и встретил Гарри в коридоре у Библиотеки. Мы разговаривали до 14:40. Потом я спустился обратно в подземелья и в 14:50 видел там Гермиону, она искала Рона" },
        { name: "Рон", image: "/assets/characters/NewYearsCH/Ron.png", text: "С 14:00 до 14:30 я был на кухне, просил пирожные. В 14:30 поднялся наверх и встретился с Гермионой в библиотеке. Мы поговорили пару минут, и я пошел в гостиную Гриффиндора" }
    ],
    suspects: [
        { id: "harry", name: "Гарри", image: "/assets/characters/NewYearsCH/Harry.png" },
        { id: "ron", name: "Рон", image: "/assets/characters/NewYearsCH/Ron.png" },
        { id: "hermione", name: "Гермиона", image: "/assets/characters/NewYearsCH/Hermione.png" },
        { id: "draco", name: "Драко", image: "/assets/characters/NewYearsCH/Malfoy.png" }
    ],
    points: 30
};
