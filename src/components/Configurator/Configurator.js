
import styles from './Configurator.module.css';
import { distributeRamModules, calcTotal } from '../../utils/priceCalculations';
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

  const countValidOptions = (property) => {
    return property.values.filter(v => v.title.toLowerCase() !== 'нет').length;
  };

  const renderRamBlock = () => {
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

    const totalValue = ramProp.values.reduce(
      (sum, v, i) => sum + v.unitValue * distribution[i],
      0
    );

    return (
      <label className={styles.configurator__item} key="RAM">
        <p>{ramProp.name}</p>
        <div className={styles.configurator__line}>
          <div className={styles.configurator__sum}>{totalValue} GB</div>
          {activeValue && (
            <div
              className={styles.singleOption}
              title={`${activeValue.title} Цена: ${activeValue.price} руб.`}
            >
              {activeValue.title}
            </div>
          )}
          <div className={styles.quantity}>
            <div
              className={styles.quantity__btn}
              onClick={() => {
                const updated = { ...config };
                updated.RAM.totalModules = Math.max(2, totalModules - 2);
                updateConfig(index, updated);
              }}
            >
              -
            </div>
            <input type="number" value={totalModules} readOnly />
            <div
              className={styles.quantity__btn}
              onClick={() => {
                const updated = { ...config };
                updated.RAM.totalModules = totalModules + 2;
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

  return (
    <div className={styles.configurator} key={item.id}>
      <div className={styles.configurator__main}>
        <img src={image} alt={name} />
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
                {config[key].map((itemValue, i) => (
                  <div className={styles.configurator__line} key={i}>
                    {(() => {
                      const opt = property.values[itemValue.index];
                      const unit = opt?.unitValue || 0;
                      const qty = itemValue.quantity;
                      const total = unit * qty;
                      return total > 0 ? (
                        <div className={styles.configurator__sum}>{total} GB</div>
                      ) : null;
                    })()}

                    {property.values.length === 1 ? (
                      <div className={styles.singleOption}
                        title={`${property.values[itemValue.index].title} Цена: ${property.values[itemValue.index0].price} руб.`}
                      >
                        {property.values[0].title}
                      </div>
                    ) : (
                      <select
                        value={itemValue.index}
                        title={`${property.values[itemValue.index].title} Цена: ${property.values[itemValue.index].price} руб.`}
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
                      <div className={styles.quantity}>
                        <div
                          className={styles.quantity__btn}
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
                        </div>
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
                ))}

                {property.max > 1 &&
                  config[key].length < countValidOptions(property) &&
                  config[key].reduce((sum, it) => sum + it.quantity, 0) < property.max && (
                    <div
                      className={styles.btnAddLine}
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
            <label className={styles.configurator__item} key={key}>
              <p>{property.name}</p>
              <div className={styles.configurator__line}>
                {unitValue > 0 && (
                  <div className={styles.configurator__sum}>{totalValue} GB</div>
                )}
                <select
                  value={selectedIndex}
                  title={`${property.values[selectedIndex].title} Цена: ${property.values[selectedIndex].price} руб.`}
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

      <div className={styles.resultPrice}>
        Стоимость с НДС {configData.nds}% <strong>{calcTotal(item, configData.nds).withNds} </strong> руб.
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