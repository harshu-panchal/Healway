const { ROLES } = require('./constants');

const modelMap = {};

const registerModel = (role, model) => {
  modelMap[role] = model;
};

const getModelForRole = (role) => {
  if (!role || !modelMap[role]) {
    throw new Error(`Unsupported role: ${role}`);
  }
  return modelMap[role];
};

module.exports = {
  registerModel,
  getModelForRole,
  ROLES,
};


