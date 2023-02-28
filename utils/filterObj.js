const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    // loop all the keys, write a condition
    // getting one by one as an element
    // if allowed fields and add that to our newObj
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

module.exports = filterObj;
