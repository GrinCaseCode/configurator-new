export function transformItemToConfigOptions(item) {
  const props = item.PROPERTIES;
  const options = {};

  for (const [key, prop] of Object.entries(props)) {
    if (!Array.isArray(prop.values)) continue;

    let values = [...prop.values];

    if (key === 'DISKS') {
      values = values.filter(v => v.title.toLowerCase() !== 'выберите значение');
    }

    const hasNetOption = values.some(v => v.title.toLowerCase() === 'нет');
    const allDefaultFalse = values.every(v => !v.default_selected);

    if (
      key !== 'RAM' &&
      !hasNetOption &&
      allDefaultFalse &&
      values.length > 0
    ) {
      values.unshift({
        title: 'Нет',
        price: 0,
        value: 0,
        default_selected: true 
      });
    }

    options[key] = {
      ...prop,
      min: prop.min || 1,
      max: prop.max || 999,
      stepOverride: prop.stepOverride || null, 
      dependence: prop.dependence || null,
      values: values.map((v, i) => ({
        title: v.title,
        price: parseInt(v.price || '0'),
        priceRaw: v.price,
        max: v.max ? parseInt(v.max) : null,
        unitValue: v.value ? parseInt(v.value) : null,
        quantity: v.quantity || 1,
        default_selected: v.default_selected || false
      }))
    };
  }

  return options;
}
export function getDefaultSelectedIndex(property) {
  const defaultSelectedIndex = property.values.findIndex(opt => opt.default_selected === true);
  if (defaultSelectedIndex !== -1) {
    return defaultSelectedIndex;
  }
  
  const netIndex = property.values.findIndex(opt => opt.title.toLowerCase() === 'нет');
  if (netIndex !== -1) {
    return netIndex;
  }
  
  return 0;
}

export function calcTotal(item, nds = 0) {
  const { config, options, basePrice, term } = item;
  let total = basePrice;

  for (const [key, prop] of Object.entries(options)) {
    if (key === 'RAM') {
      const ramConfig = config[key];
      const activeIndex = ramConfig.selectedIndex || 0;
      const activeValue = prop.values[activeIndex];
      const totalModules = ramConfig.totalModules || 1;

      let ramModules = [];
      for (let i = 0; i < totalModules; i++) {
        ramModules.push(activeValue.price);
      }
      ramModules.sort((a, b) => a - b);
      ramModules = ramModules.slice(2);

      total += ramModules.reduce((sum, price) => sum + price, 0);

    } else if (prop.multiple) {
      config[key].forEach(d => {
        const option = prop.values[d.index];
        const optionPrice = option?.price || 0;
        const optionQuantity = option?.quantity || 1;
        const userQuantity = d.quantity || 1; 
        total += optionPrice * optionQuantity * userQuantity;
      });
    } else if (prop.count) {
      const sel = config[key].selectedIndex;
      const option = prop.values[sel];
      const optionPrice = option?.price || 0;
      const optionQuantity = option?.quantity || 1;
      const userQuantity = config[key].quantity || 1;
      total += optionPrice * optionQuantity * userQuantity;
    } else {
      const selectedOption = prop.values[config[key]];
      const optionPrice = selectedOption?.price || 0;
      const optionQuantity = selectedOption?.quantity || 1;
      total += optionPrice * optionQuantity;
    }
  }

  if (term === '12m') {
    total = total * 0.85;
  }

  return {
    base: Math.round(total),
    withNds: Math.round(total * (1 + nds / 100))
  };
}