import styles from './Configurator.module.css';
import { calcTotal } from '../../utils/priceCalculations';
import { Modal } from '../Modal/Modal';

export function Configurator({
  item,
  configData,
  updateConfig,
  updateTerm,
  setIsModalOpen
}) {
  const { name, image, options, config, isModalOpen, term } = item;
  const index = configData.items.findIndex(c => c.id === item.id);

  const getDisplayUnit = (title) => {
    if (title.toLowerCase().includes('tb') || title.toLowerCase().includes('тб')) {
      return 'TB';
    }
    if (title.toLowerCase().includes('gb') || title.toLowerCase().includes('гб')) {
      return 'GB';
    }
    return 'GB';
  };

  const formatStorageValue = (value, unit) => {
    if (unit === 'TB') {
      return (value / 1024).toFixed(1); 
    }
    return value;
  };

  const countValidOptions = (property) => {
    return property.values.filter(v => v.title.toLowerCase() !== 'нет').length;
  };

  const getAvailableOptions = (property, currentConfig, currentIndex) => {
    const selectedIndices = currentConfig
      .filter((_, idx) => idx !== currentIndex)
      .map(item => item.index)
      .filter(index => index !== -1);

    return property.values.filter((opt, idx) =>
      !selectedIndices.includes(idx) || opt.title.toLowerCase() === 'нет'
    );
  };

  const getFirstAvailableIndex = (property, currentConfig) => {
    const selectedIndices = currentConfig.map(item => item.index);

    for (let i = 0; i < property.values.length; i++) {
      if (!selectedIndices.includes(i) || property.values[i].title.toLowerCase() === 'нет') {
        return i;
      }
    }
    return 0;
  };

  const formatOptionDisplay = (option, currentQuantity = 1) => {
    if (option.quantity && option.quantity > 1) {
      return `${option.quantity} × ${option.title}`;
    }
    return option.title;
  };

  const calculateOptionPrice = (option, currentQuantity = 1) => {
    const basePrice = option.price || 0;
    if (option.quantity && option.quantity > 1) { 
      return basePrice * option.quantity;
    }
    return basePrice;
  };

const renderRamBlock = () => {
  const ramProp = options.RAM;
  
  const step = ramProp.stepOverride 
    ? parseInt(ramProp.stepOverride) 
    : (ramProp.chetnoe ? 2 : 1);

  return (
    <label className={styles.configurator__item} key="RAM">
      <p>{ramProp.name}</p>
      {config.RAM.map((itemValue, i) => {
        const availableOptions = getAvailableOptions(ramProp, config.RAM, i);
        const selectedOption = ramProp.values[itemValue.index];
        const quantity = itemValue.quantity;

        const freeModules = step;
        const paidModules = Math.max(0, quantity - freeModules);

        return (
          <div className={styles.configurator__line} key={i}>
            {(() => {
              const opt = selectedOption;
              const unit = opt?.unitValue || 0; 
              const qty = quantity;
              const total = unit * qty;
              const displayUnit = getDisplayUnit(opt.title);
              const formattedValue = formatStorageValue(total, displayUnit);

              return total > 0 ? (
                <div className={styles.configurator__sum}>
                  {formattedValue} {displayUnit}
                </div>
              ) : null;
            })()}

            <select
              value={itemValue.index}
              onChange={(e) => {
                const updated = [...config.RAM];
                updated[i].index = +e.target.value;
                updated[i].quantity = step;
                updateConfig(index, { ...config, RAM: updated });
              }}
            >
              {availableOptions.map((opt, idx) => (
                <option key={idx} value={ramProp.values.indexOf(opt)}>
                  {formatOptionDisplay(opt, quantity)} 
                  {(opt.priceRaw && parseInt(opt.priceRaw) !== 0) ? ` + ${calculateOptionPrice(opt, paidModules)} руб.` : ''}
                </option>
              ))}
            </select>

            {ramProp.max > 1 && selectedOption?.title?.toLowerCase() !== 'нет' && (
              <div className={styles.quantity}>
                <button
                  className={styles.quantity__btn}
                  onClick={() => {
                    const updated = [...config.RAM];
                    const newQuantity = Math.max(step, updated[i].quantity - step);
                    updated[i].quantity = newQuantity;
                    updateConfig(index, { ...config, RAM: updated });
                  }}
                  disabled={quantity <= step}
                >
                  -
                </button>
                <input type="number" value={quantity} readOnly />
                <button
                  className={`${styles.quantity__btn} ${config.RAM.reduce((sum, it) => sum + it.quantity, 0) >= ramProp.max ? styles.disabled : ''}`}
                  onClick={() => {
                    const totalQty = config.RAM.reduce((sum, it) => sum + it.quantity, 0);
                    if (totalQty < ramProp.max) {
                      const updated = [...config.RAM];
                      updated[i].quantity += step;
                      updateConfig(index, { ...config, RAM: updated });
                    }
                  }}
                >
                  +
                </button>
              </div>
            )}

          </div>
        );
      })}

    </label>
  );
};

  return (
    <div className={styles.configurator} key={item.id}>
      <div className={styles.configurator__main}>
        <div className={styles.configurator__image}>
          <img src={image} alt={name} />
        </div>
        <h1 className={styles.configurator__title}>{name}</h1>
      </div>

      <div className={styles.term}>
        <div
          className={`${styles.term__btn} ${term === '1m' ? styles.active : ''}`}
          onClick={() => updateTerm(index, '1m')}
        >
          1 мес.
        </div>
        <div
          className={`${styles.term__btn} ${term === '12m' ? styles.active : ''}`}
          onClick={() => updateTerm(index, '12m')}
        >
          12 мес. <small>-15%</small>
        </div>
      </div>

      <div className={styles.configurator__content}>
        {Object.entries(options).map(([key, property]) => {
          if (key === 'RAM') return renderRamBlock();

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
              <label className={styles.configurator__item} key={key}>
                <p>{property.name}</p>
                {config[key].map((itemValue, i) => {
                  const availableOptions = getAvailableOptions(property, config[key], i);
                  const selectedOption = property.values[itemValue.index];
                  const quantity = itemValue.quantity;

                  return (
                    <div className={styles.configurator__line} key={i}>
                      {(() => {
                        const opt = selectedOption;
                        const unit = opt?.unitValue || 0;
                        const qty = quantity;
                        const total = unit * qty;
                        const displayUnit = getDisplayUnit(opt.title);
                        const formattedValue = formatStorageValue(total, displayUnit);

                        return total > 0 ? (
                          <div className={styles.configurator__sum}>
                            {formattedValue} {displayUnit}
                          </div>
                        ) : null;
                      })()}

                      {property.values.length === 1 ? (
                        <div className={styles.singleOption}>
                          {formatOptionDisplay(selectedOption, quantity)}
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
                          {availableOptions.map((opt, idx) => (
                            <option key={idx} value={property.values.indexOf(opt)}>
                              {formatOptionDisplay(opt, quantity)} 
                              {(opt.priceRaw && parseInt(opt.priceRaw) !== 0) ? ` + ${calculateOptionPrice(opt, quantity)} руб.` : ''}
                            </option>
                          ))}
                        </select>
                      )}

                      {property.max > 1 && selectedOption?.title?.toLowerCase() !== 'нет' && (
                        <div className={styles.quantity}>
                          <button
                            className={styles.quantity__btn}
                            onClick={() => {
                              const updated = [...config[key]];
                              updated[i].quantity = Math.max(property.min, updated[i].quantity - 1);
                              updateConfig(index, { ...config, [key]: updated });
                            }}
                          >
                            -
                          </button>
                          <input type="number" value={quantity} readOnly />
                          <button
                            className={`${styles.quantity__btn} ${config[key].reduce((sum, it) => sum + it.quantity, 0) >= property.max ? styles.disabled : ''}`}
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
                          </button>
                        </div>
                      )}

                      {i > 0 && (
                        <div
                          className={styles.btnRemoveLine}
                          onClick={() => {
                            const updated = config[key].filter((_, idx) => idx !== i);
                            updateConfig(index, { ...config, [key]: updated });
                          }}
                        >
                          X
                        </div>
                      )} 
                    </div>
                  );
                })}

                {property.max > 1 &&
                  config[key].length < countValidOptions(property) &&
                  config[key].reduce((sum, it) => sum + it.quantity, 0) < property.max &&
                  !config[key].some(item => {
                    const opt = property.values[item.index];
                    return opt && opt.title.toLowerCase() === 'нет';
                  }) && (
                    <div
                      className={styles.btnAddLine}
                      onClick={() => {
                        const totalQty = config[key].reduce((sum, it) => sum + it.quantity, 0);
                        if (totalQty < property.max) {
                          const firstAvailableIndex = getFirstAvailableIndex(property, config[key]);
                          updateConfig(index, {
                            ...config,
                            [key]: [...config[key], {
                              index: firstAvailableIndex,
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
            <label className={styles.configurator__item} key={key}>
              <p>{property.name}</p>
              <div className={styles.configurator__line}>
                {unitValue > 0 && (
                  <div className={styles.configurator__sum}>
                    {formatStorageValue(totalValue, getDisplayUnit(selected.title))} {getDisplayUnit(selected.title)}
                  </div>
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
                      {formatOptionDisplay(opt, quantity)} 
                      {(opt.priceRaw && parseInt(opt.priceRaw) !== 0) ? ` + ${calculateOptionPrice(opt, quantity)} руб.` : ''}
                    </option>
                  ))}
                </select>
              </div> 
            </label>
          );
        })}
      </div>

      <div className={styles.resultPrice}>
        Стоимость с НДС {configData.nds}% <strong>{calcTotal(item, configData.nds).withNds} </strong> рублей в месяц
      </div>
      <button className={styles.btnMain} onClick={() => setIsModalOpen(index, true)}>Заказать</button>

      {isModalOpen && (
       <Modal
        item={item}
        configData={configData}
        setIsModalOpen={(open) => setIsModalOpen(index, open)}
        options={options}
        config={config}
      />
      )}
    </div>
  );
}