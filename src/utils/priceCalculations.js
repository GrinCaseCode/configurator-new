export function transformItemToConfigOptions(item) {
  const props = item.PROPERTIES;
  const options = {};

  for (const [key, prop] of Object.entries(props)) {
    if (!Array.isArray(prop.values)) continue;

    let values = [...prop.values];

    if (key === 'DISKS') {
      values = values.filter(v => v.title.toLowerCase() !== 'выберите значение');
    }

    if (
      key !== 'RAM' &&
      values.length > 0 &&
      !values.some(v => v.title.toLowerCase() === 'нет') &&
      parseInt(values[0].price || '0') !== 0
    ) {
      values.unshift({
        title: 'Нет',
        price: 0,
        value: 0
      });
    }

    options[key] = {
      ...prop,
      min: prop.min || 1,
      max: prop.max || 999,
      dependence: prop.dependence || null,
      values: values.map((v, i) => ({
        title: v.title,
        price: parseInt(v.price || '0'),
        priceRaw: v.price,
        max: v.max ? parseInt(v.max) : null,
        unitValue: v.value ? parseInt(v.value) : null
      }))
    };
  }

  return options;
}

export function distributeRamModules(totalModules, values) {
  let remaining = totalModules;
  const distribution = [];

  for (const value of values) {
    if (remaining <= 0) {
      distribution.push(0);
      continue;
    }
    const maxForType = value.max || remaining;
    const count = Math.min(remaining, maxForType);
    distribution.push(count);
    remaining -= count;
  }

  return distribution;
}

export function calcTotal(item, nds = 0) {
  const { config, options, basePrice, term } = item;
  let total = basePrice;

  for (const [key, prop] of Object.entries(options)) {
    if (key === 'RAM') {
      const ramConfig = config[key];
      const distribution = distributeRamModules(ramConfig.totalModules, prop.values);
      let ramModules = [];
      distribution.forEach((count, idx) => {
        for (let i = 0; i < count; i++) {
          ramModules.push(prop.values[idx].price);
        }
      });
      ramModules.sort((a, b) => a - b);
      ramModules = ramModules.slice(2);
      total += ramModules.reduce((sum, price) => sum + price, 0);
    } else if (prop.multiple) {
      config[key].forEach(d => {
        total += (prop.values[d.index]?.price || 0) * d.quantity;
      });
    } else if (prop.count) {
      const sel = config[key].selectedIndex;
      total += (prop.values[sel]?.price || 0) * config[key].quantity;
    } else {
      total += prop.values[config[key]]?.price || 0;
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