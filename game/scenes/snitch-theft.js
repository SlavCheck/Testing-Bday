"use strict";
// The answer is private and validated in server.js.
module.exports = {
    id: "snitch-theft",
    type: "snitch_mystery",
    title: "Кто украл Золотой Снитч?",
    duration: 60,
    text: "Золотой Снитч пропал из запертой комнаты между 14:00 и 15:00. Дверь была заперта, а окно открыто.",
    clues: [
        "Кража произошла между 14:00 и 15:00.",
        "Дверь комнаты была заперта.",
        "Окно комнаты было открыто.",
        "Мадам Пинс подтвердила, что Гермиона всё время была в библиотеке одна и ни с кем не разговаривала."
    ],
    dialogues: [
        { name: "Гарри", image: "/assets/characters/NewYearsCH/Harry.png", text: "С 14:00 до 14:30 я был в Выручай-комнате. Репетировал заклинание. В 14:30 вышел и встретил Драко в коридоре рядом с библиотекой. Мы разговаривали минут десять, потом я пошел на поле" },
        { name: "Гермиона", image: "/assets/characters/NewYearsCH/Hermione.png", text: "С 14:00 до 14:45 я была в библиотеке. В 14:30 я видела, как Гарри разговаривал с Драко в коридоре. В 14:45 отправилась искать Рона." },
        { name: "Драко", image: "/assets/characters/NewYearsCH/Malfoy.png", text: "С 14:00 до 14:30 я был в подземельях у Слизерина. В 14:30 поднялся наверх и встретил Гарри в коридоре у Библиотеки. Мы разговаривали до 14:40. Потом я спустился обратно в подземелья и в 14:50 видел там Гермиону, она искала Рона" },
        { name: "Рон", image: "/assets/characters/NewYearsCH/Ron.png", text: "С 14:00 до 14:30 я был на кухне, просил пирожные. Потом пошёл к Гермионе. В 14:35 мы встретились в библиотеке и немного поговорили. А дальше я отправился в гостиную." }
    ],
    suspects: [
        { id: "harry", name: "Гарри", image: "/assets/characters/NewYearsCH/Harry.png" },
        { id: "ron", name: "Рон", image: "/assets/characters/NewYearsCH/Ron.png" },
        { id: "hermione", name: "Гермиона", image: "/assets/characters/NewYearsCH/Hermione.png" },
        { id: "draco", name: "Драко", image: "/assets/characters/NewYearsCH/Malfoy.png" }
    ],
    points: 30
};
