"use strict";
module.exports = {
 id: "potion-recipe", type: "potion_recipe", title: "Собери зелье по рецепту!",
 duration: 50, memorizeSeconds: 20, points: 30,
 recipeText: "Возьмите корень мандрагоры и измельчите его. Добавьте шкуру бумсланга и тщательно перемешайте. Влейте слезу феникса и доведите до кипения. Затем добавьте порошок бирюзы и щепотку волос единорога. Варите пять минут, помешивая палочкой из остролиста.",
 ingredients: [
  {id:"boomslang",label:"Шкура бумсланга"},
  {id:"turquoise",label:"Порошок бирюзы"},
  {id:"unicorn_hair",label:"Волос единорога"},
  {id:"holly_wand",label:"Палочка из остролиста"},
  {id:"phoenix_tear",label:"Слеза феникса"},
  {id:"mandrake",label:"Корень мандрагоры"},
  {id:"dragon_eye",label:"Глаз дракона"},
  {id:"unicorn_blood",label:"Кровь единорога"},
  {id:"dragon_scale",label:"Чешуя дракона"}
 ],
 correctIds:["boomslang","turquoise","unicorn_hair","holly_wand","phoenix_tear","mandrake"]
};