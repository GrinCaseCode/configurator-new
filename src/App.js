import './App.css';
import { useState, useEffect } from 'react';

function transformItemToConfigOptions(item) {
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

function App() {
  const [configData, setConfigData] = useState([]);
  const [activeFilter, setActiveFilter] = useState(null);

  const countValidOptions = (property) => {
    return property.values.filter(v => v.title.toLowerCase() !== 'нет').length;
  };

  useEffect(() => {
    const rootDiv = document.getElementById('root');
    const jsonString = rootDiv?.getAttribute('data-parameters');
    if (!jsonString) return;

    const parsedData = JSON.parse(jsonString);
    const configs = [];

    for (const item of Object.values(parsedData)) {
      const options = transformItemToConfigOptions(item);
      if (Object.keys(options).length === 0) continue;

      const defaultConfig = {};
      for (const [key, prop] of Object.entries(options)) {
        if (key === 'RAM') {
          defaultConfig[key] = [{ index: 0, quantity: prop.min || 1 }];
        } else if (prop.multiple) {
          defaultConfig[key] = [{ index: 0, quantity: prop.min || 1 }];
        } else {
          defaultConfig[key] = 0;
        }
      }

      configs.push({
        id: item.ID,
        name: item.NAME,
        image: item.PREVIEW_PICTURE,
        basePrice: parseInt((item.PRICE || '').replace(/\s/g, '')) || 0,
        options,
        config: defaultConfig,
        isModalOpen: false,
        FILTER: item.FILTER,
        term: '1m'
      });
    }

    setConfigData(configs);
  }, []);

  const updateConfig = (index, newConfig) => {
    setConfigData(prev =>
      prev.map((item, i) => (i === index ? { ...item, config: newConfig } : item))
    );
  };

  const updateTerm = (index, newTerm) => {
    setConfigData(prev =>
      prev.map((item, i) => (i === index ? { ...item, term: newTerm } : item))
    );
  };

  const setIsModalOpen = (index, open) => {
    setConfigData(prev =>
      prev.map((item, i) => (i === index ? { ...item, isModalOpen: open } : item))
    );
  };

  const distributeRamModules = (totalModules, values) => {
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
  };

  const calcTotal = (item) => {
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
      total = Math.round(total * 0.85);
    }

    return total;
  };

  const calcFullPrice = (item) => {
    const monthly = calcTotal(item);
    return item.term === '12m' ? monthly * 12 : monthly;
  };

  const renderRamBlock = (index, options, config) => {
    const ramProp = options.RAM;
    const ramConfig = config.RAM;

    const totalModules = ramConfig.totalModules || 1;
    const distribution = distributeRamModules(totalModules, ramProp.values);

    const activeIndex = (() => {
      for (let i = distribution.length - 1; i >= 0; i--) {
        if (distribution[i] > 0) return i;
      }
      return 0;
    })();

    const activeValue = ramProp.values[activeIndex];
    const activeCount = distribution[activeIndex] || 0;

    const totalValue = ramProp.values.reduce(
      (sum, v, i) => sum + v.unitValue * distribution[i],
      0
    );

    return (
      <label className="configurator__item" key="RAM">
        <p>{ramProp.name}</p>
        <div className="configurator__line">
          <div className="configurator__sum">{totalValue} GB</div>
          {activeValue && (
            <div
              className="single-option"
              title={`${activeValue.title} Цена: ${activeValue.price} руб.`}
            >
              {activeValue.title}
            </div>
          )}
          <div className="quantity">
            <div
              className="quantity__btn"
              onClick={() => {
                const updated = { ...config };
                updated.RAM.totalModules = Math.max(1, totalModules - 1);
                updateConfig(index, updated);
              }}
            >
              -
            </div>
            <input type="number" value={totalModules} readOnly />
            <div
              className="quantity__btn"
              onClick={() => {
                const updated = { ...config };
                updated.RAM.totalModules = totalModules + 1;
                updateConfig(index, updated);
              }}
            >
              +
            </div>
          </div>
        </div>

      </label>
    );
  };



  const renderConfigurator = (item) => {
    const index = configData.findIndex(c => c.id === item.id);
    const { name, image, options, config, isModalOpen } = item;

    return (
      <div className="configurator" key={item.id}>
        <div className="configurator__main">
          <img src={image} alt={name} />
          <h1 className="configurator__title">{name}</h1>
        </div>

        <div className="term">
          <div
            className={`term__btn ${item.term === '1m' ? 'active' : ''}`}
            onClick={() => updateTerm(index, '1m')}
          >
            1 мес.
          </div>
          <div
            className={`term__btn ${item.term === '12m' ? 'active' : ''}`}
            onClick={() => updateTerm(index, '12m')}
          >
            12 мес. <small>-15%</small>
          </div>
        </div>

        <div className="configurator__content">
          {Object.entries(options).map(([key, property]) => {
            if (key === 'RAM') return renderRamBlock(index, options, config);

            if (property.dependence) {
              const depKey = property.dependence;
              const depProp = options[depKey];
              const depConfig = config[depKey];
              let hasNet = false;

              if (depProp.multiple && Array.isArray(depConfig)) {
                hasNet = depConfig.some(d => {
                  const val = depProp.values?.[d.index]?.title?.toLowerCase();
                  return val === 'нет';
                });
              } else {
                const selectedIndex = depConfig?.selectedIndex ?? depConfig;
                const val = depProp.values?.[selectedIndex]?.title?.toLowerCase();
                hasNet = val === 'нет';
              }

              if (hasNet) return null;
            }

            if (property.multiple) {
              return (
                <label className="configurator__item" key={key}>
                  <p>{property.name}</p>
                  {config[key].map((itemValue, i) => (
                    <div className="configurator__line" key={i}>

                      {(() => {
                        const opt = property.values[itemValue.index];
                        const unit = opt?.unitValue || 0;
                        const qty = itemValue.quantity;
                        const total = unit * qty;
                        return total > 0 ? (
                          <div className="configurator__sum">{total} GB</div>
                        ) : null;
                      })()}

                      {property.values.length === 1 ? (
                        <div className="single-option" title={property.values[0].title}>
                          {property.values[0].title}
                        </div>
                      ) : (
                        <select
                          value={itemValue.index}
                          onChange={(e) => {
                            const updated = [...config[key]];
                            updated[i].index = +e.target.value;
                            updateConfig(index, { ...config, [key]: updated });
                          }}
                        >
                          {property.values.map((opt, idx) => (
                            <option key={idx} value={idx}>
                              {opt.title} {(opt.priceRaw && parseInt(opt.priceRaw) !== 0) ? `+ ${opt.price} руб.` : ''}
                            </option>
                          ))}
                        </select>
                      )}

                      {property.max > 1 && property.values[itemValue.index]?.title?.toLowerCase() !== 'нет' && (
                        <div className="quantity">
                          <div
                            className="quantity__btn"
                            onClick={() => {
                              const updated = [...config[key]];
                              updated[i].quantity = Math.max(property.min, updated[i].quantity - 1);
                              updateConfig(index, { ...config, [key]: updated });
                            }}
                          >
                            -
                          </div>
                          <input type="number" value={itemValue.quantity} readOnly />
                          <div
                            className={`quantity__btn ${config[key].reduce((sum, it) => sum + it.quantity, 0) >= property.max ? 'disabled' : ''}`}
                            onClick={() => {
                              const totalQty = config[key].reduce((sum, it) => sum + it.quantity, 0);
                              if (totalQty < property.max) {
                                const updated = [...config[key]];
                                updated[i].quantity += 1;
                                updateConfig(index, { ...config, [key]: updated });
                              }
                            }}
                          >
                            +
                          </div>
                        </div>
                      )}

                      {i > 0 && (
                        <div
                          className="btn-remove-line"
                          onClick={() => {
                            const updated = config[key].filter((_, idx) => idx !== i);
                            updateConfig(index, { ...config, [key]: updated });
                          }}
                        >
                          X
                        </div>
                      )}
                    </div>
                  ))}

                  {property.max > 1 &&
                    config[key].length < countValidOptions(property) &&
                    config[key].reduce((sum, it) => sum + it.quantity, 0) < property.max && (
                      <div
                        className="btn-add-line"
                        onClick={() => {
                          const totalQty = config[key].reduce((sum, it) => sum + it.quantity, 0);
                          if (totalQty < property.max) {
                            const firstValidIndex = property.values.findIndex(
                              v => v.title.toLowerCase() !== 'нет'
                            );
                            updateConfig(index, {
                              ...config,
                              [key]: [...config[key], {
                                index: firstValidIndex !== -1 ? firstValidIndex : 0,
                                quantity: property.min
                              }]
                            });
                          }
                        }}
                      >
                        <strong>+</strong> Добавить ещё
                      </div>
                    )}


                </label>
              );
            }

            const selectedIndex = config[key]?.selectedIndex ?? config[key];
            const selected = property.values[selectedIndex];
            const unitValue = selected?.unitValue || 0;
            const quantity = property.count ? config[key].quantity : 1;
            const totalValue = unitValue * quantity;

            return (
              <label className="configurator__item" key={key}>
                <p>{property.name}</p>
                <div className="configurator__line">
                  {unitValue > 0 && (
                    <div className="configurator__sum">{totalValue} GB</div>
                  )}
                  <select
                    value={selectedIndex}
                    onChange={(e) => {
                      const newIndex = parseInt(e.target.value, 10);
                      if (property.count) {
                        updateConfig(index, {
                          ...config,
                          [key]: { ...config[key], selectedIndex: newIndex }
                        });
                      } else {
                        updateConfig(index, { ...config, [key]: newIndex });
                      }
                    }}
                  >
                    {property.values.map((opt, idx) => (
                      <option key={idx} value={idx}>
                        {opt.title} {(opt.priceRaw && parseInt(opt.priceRaw) !== 0) ? `+ ${opt.price} руб.` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            );
          })}
        </div>

        <div className="result-price">Стоимость: <strong>{calcTotal(item)} руб.</strong></div>
        <button className="btn-main" onClick={() => setIsModalOpen(index, true)}>Заказать</button>

        {isModalOpen && (
          <div className="modal">
            <div
              className="modal__overlay"
              onClick={() => setIsModalOpen(index, false)}
            ></div>
            <div className="modal__content">
              <div
                className="modal__close"
                onClick={() => setIsModalOpen(index, false)}
              >
                ×
              </div>
              <div className="modal__title">Форма заказа</div>
              <div className="modal__feature">
                <strong>{name}</strong>
              </div>

              {Object.entries(options).map(([key, property]) => {
                if (!property.values) return null;

                // Особый случай для RAM
                if (key === 'RAM') {
                  const ramConfig = config[key];
                  const totalModules = ramConfig.totalModules || 1;
                  const distribution = distributeRamModules(totalModules, property.values);

                  const activeIndex = (() => {
                    for (let i = distribution.length - 1; i >= 0; i--) {
                      if (distribution[i] > 0) return i;
                    }
                    return 0;
                  })();

                  const activeValue = property.values[activeIndex];
                  const activeCount = distribution[activeIndex] || 0;
                  const totalValue = property.values.reduce(
                    (sum, v, i) => sum + v.unitValue * distribution[i],
                    0
                  );

                  return (
                    <div className="modal__feature" key={key}>
                      <span>{property.name}:</span> {totalValue} GB ({activeValue.title} × {activeCount} шт.)
                    </div>
                  );
                }

                if (Array.isArray(config[key])) {
                  const selected = config[key].filter(d => {
                    const opt = property.values[d.index];
                    return opt && opt.title.toLowerCase() !== 'нет';
                  });

                  if (selected.length === 0) return null;

                  return (
                    <div className="modal__feature" key={key}>
                      <span>{property.name}:</span>{' '}
                      {selected.map((d, i) => {
                        const itemVal = property.values[d.index];
                        if (!itemVal || itemVal.title.toLowerCase() === 'нет')
                          return null;

                        return (
                          <div key={i}>
                            {itemVal.title}
                            {d.quantity > 1 ? ` × ${d.quantity} шт.` : ''}
                          </div>
                        );
                      })}
                    </div>
                  );
                }

                const selected = property.values[config[key]];
                if (!selected || selected.title.toLowerCase() === 'нет') return null;

                return (
                  <div className="modal__feature" key={key}>
                    <span>{property.name}:</span> {selected.title}
                  </div>
                );
              })}

              <div className="result-price">
                Итоговая сумма: <strong>{calcFullPrice(item)} руб.</strong>
              </div>
              <form>
                <div className="item-form">
                  <input type="text" required placeholder="Имя" />
                </div>
                <div className="item-form">
                  <input type="email" required placeholder="E-mail" />
                </div>
                <div className="item-form">
                  <input type="tel" required placeholder="Телефон" />
                </div>
                <div className="item-form">
                  <textarea placeholder="Комментарий"></textarea>
                </div>
                <button className="btn-main">Заказать</button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="App">
      <div className="container">
        <div className="filter">
          <div
            className={`filter__btn ${activeFilter === 'CPU2' ? 'active' : ''}`}
            onClick={() => setActiveFilter(prev => prev === 'CPU2' ? null : 'CPU2')}
          >
            HPE cерверы с 2 CPU
          </div>
          <div
            className={`filter__btn ${activeFilter === 'CPU4' ? 'active' : ''}`}
            onClick={() => setActiveFilter(prev => prev === 'CPU4' ? null : 'CPU4')}
          >
            HPE cерверы с 4 CPU
          </div>
          <div
            className={`filter__btn ${activeFilter === 'GPU' ? 'active' : ''}`}
            onClick={() => setActiveFilter(prev => prev === 'GPU' ? null : 'GPU')}
          >
            HPE cерверы с GPU
          </div>
          <div
            className={`filter__btn ${activeFilter === 'MICROSERVERS' ? 'active' : ''}`}
            onClick={() => setActiveFilter(prev => prev === 'MICROSERVERS' ? null : 'MICROSERVERS')}
          >
            Микросерверы HPE
          </div>
          <div
            className={`filter__btn ${activeFilter === 'STORAGE' ? 'active' : ''}`}
            onClick={() => setActiveFilter(prev => prev === 'STORAGE' ? null : 'STORAGE')}
          >
            HPE cерверы для хранения
          </div>
          <div
            className={`filter__btn ${activeFilter === 'LUN_SHD' ? 'active' : ''}`}
            onClick={() => setActiveFilter(prev => prev === 'LUN_SHD' ? null : 'LUN_SHD')}
          >
            Луны на СХД HPE 3PAR
          </div>
        </div>
        <div className="row-main">
          {configData
            .filter(item => {
              if (!activeFilter) return true;
              if (!item.FILTER) return false;
              const filters = item.FILTER.split(' ');
              return filters.includes(activeFilter);
            })
            .map(item => renderConfigurator(item))}
        </div>
      </div>
    </div>
  );
}

export default App;
