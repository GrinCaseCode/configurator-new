import styles from './Modal.module.css';
import { calcTotal, distributeRamModules } from '../../utils/priceCalculations';

export function Modal({ item, configData, setIsModalOpen, options, config }) {
  const { name } = item;


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
              <div className={styles.modal__feature} key={key}>
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
                  {itemVal.title}
                  {d.quantity > 1 ? ` × ${d.quantity} шт.` : ''}
                  {/* {diskSize > 0 && ` = ${itemTotalSize} Gb`} */}
                </div>
              );
            });

            return (
              <div className={styles.modal__feature} key={key}>
                <span>{property.name}:</span>{' '}
                {diskItems}
                {totalSize > 0 && (
                  <div style={{ marginTop: '5px', fontWeight: 'bold' }}>
                    Общий объем: {totalSize} Gb
                  </div>
                )}
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
          Арендная плата в месяц с НДС {configData.nds}%: <strong>{calcTotal(item, configData.nds).withNds} рублей</strong>
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