const Joi = require("joi");

const Schema = Joi.object({
    emailadress: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    namesurname: Joi.string().optional(),
    username: Joi.string().optional()
});

module.exports = Schema;
