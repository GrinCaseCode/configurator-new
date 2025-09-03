import styles from './Modal.module.css';
import { calcTotal } from '../../utils/priceCalculations';

export function Modal({ item, configData, setIsModalOpen, options, config }) {
  const { name } = item;

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

  const checkDependence = (property, options, config) => {
    if (!property.dependence) return true;

    const depKey = property.dependence;
    const depProp = options[depKey];
    if (!depProp) return true;

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

    return !hasNet;
  };

  return (
    <div className={styles.modal}>
      <div
        className={styles.modal__overlay}
        onClick={() => setIsModalOpen(false)}
      ></div>
      <div className={styles.modal__content}>
        <div
          className={styles.modal__close}
          onClick={() => setIsModalOpen(false)}
        >
          ×
        </div>
        <div className={styles.modal__title}>Форма заказа</div>
        <div className={styles.modal__feature}>
          <strong>{name}</strong>
        </div>

        {Object.entries(options).map(([key, property]) => {
          if (!property.values) return null;

          if (!checkDependence(property, options, config)) {
            return null;
          }

          if (key === 'RAM') {
            const ramConfig = config[key];
            const activeIndex = ramConfig.selectedIndex || 0;
            const activeValue = property.values[activeIndex];
            const totalModules = ramConfig.totalModules || 1;
            const totalValue = activeValue.unitValue * totalModules;
            const displayUnit = getDisplayUnit(activeValue.title);
            const formattedValue = formatStorageValue(totalValue, displayUnit);

            return (
              <div className={styles.modal__feature} key={key}>
                <span>{property.name}:</span> {formattedValue}GB <br />  {totalModules} × {displayUnit} {activeValue.title}
              </div>
            );
          }

          if (Array.isArray(config[key])) {
            const selected = config[key].filter(d => {
              const opt = property.values[d.index];
              return opt && opt.title.toLowerCase() !== 'нет';
            });

            if (selected.length === 0) return null;

            let totalSize = 0;
            const diskItems = selected.map((d, i) => {
              const itemVal = property.values[d.index];
              if (!itemVal || itemVal.title.toLowerCase() === 'нет')
                return null;

              const diskSize = itemVal.unitValue ? parseInt(itemVal.unitValue) : 0;
              const itemTotalSize = diskSize * d.quantity;
              totalSize += itemTotalSize;

              return (
                <div key={i}>
                  {d.quantity > 1 ? `${d.quantity} × ` : ''}
                  {itemVal.title}

                </div>
              );
            });

            let displayUnit = 'GB';
            let formattedTotalSize = totalSize;

            if (totalSize >= 1024) {
              displayUnit = 'TB';
              formattedTotalSize = (totalSize / 1024).toFixed(1);
            }

            return (
              <div className={styles.modal__feature} key={key}>
                <span>{property.name}:</span>{' '}
                {totalSize > 0 && (
                  <div style={{ display: 'inline' }}>
                    {formattedTotalSize} {displayUnit}
                  </div>
                )}

                {diskItems}
              </div>
            );
          }

          const selected = property.values[config[key]];
          if (!selected || selected.title.toLowerCase() === 'нет') return null;

          return (
            <div className={styles.modal__feature} key={key}>
              <span>{property.name}:</span> {selected.title}
            </div>
          );
        })}

        <div className={styles.resultPrice}>
          Арендная плата в месяц с НДС {configData.nds}%: <strong>{calcTotal(item, configData.nds).withNds.toLocaleString('ru')} рублей</strong>
        </div>
        <div className={styles.resultPrice}>
          Оплата за 12 мес. с НДС {configData.nds}%: <strong>
            {(calcTotal({ ...item, term: '12m' }, configData.nds).withNds * 12).toLocaleString('ru')} рублей
          </strong>
        </div>
        <form>
          <div className={styles.itemForm}>
            <input type="text" required placeholder="Имя" />
          </div>
          <div className={styles.itemForm}>
            <input type="email" required placeholder="E-mail" />
          </div>
          <div className={styles.itemForm}>
            <input type="tel" required placeholder="Телефон" />
          </div>
          <div className={styles.itemForm}>
            <textarea placeholder="Комментарий"></textarea>
          </div>
          <button className={styles.btnMain}>Заказать</button>
        </form>
      </div>
    </div>
  );
}