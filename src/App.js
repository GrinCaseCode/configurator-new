import { useState, useEffect } from 'react';
import styles from './App.module.css';
import { Filter } from './components/Filter/Filter';
import { Configurator } from './components/Configurator/Configurator';
import { transformItemToConfigOptions } from './utils/priceCalculations';

function App() {
  const [configData, setConfigData] = useState({ nds: 0, items: [] });
  const [activeFilter, setActiveFilter] = useState(null);

  useEffect(() => {
    const rootDiv = document.getElementById('root');
    const jsonString = rootDiv?.getAttribute('data-parameters');
    if (!jsonString) return;

    const parsedData = JSON.parse(jsonString);

    const ndsValue = parsedData.nds || 0;

    const configs = Object.values(parsedData)
      .filter(item => item && item.ID)
      .map(item => {
        const options = transformItemToConfigOptions(item);
        if (Object.keys(options).length === 0) return null;

        const defaultConfig = {};
        for (const [key, prop] of Object.entries(options)) {
          if (key === 'RAM') {
            defaultConfig[key] = [{ index: 0, quantity: prop.min || 1 }];

            const step = prop.stepOverride
              ? parseInt(prop.stepOverride)
              : (prop.chetnoe ? 2 : 1);

            defaultConfig[key].totalModules = step;
            defaultConfig[key].selectedIndex = 0;
          } else if (prop.multiple) {
            defaultConfig[key] = [{ index: 0, quantity: prop.min || 1 }];
          } else {
            defaultConfig[key] = 0;
          }
        }

        return {
          id: item.ID,
          name: item.NAME,
          image: item.PREVIEW_PICTURE,
          basePrice: parseInt((item.PRICE || '').replace(/\s/g, '')) || 0,
          options,
          config: defaultConfig,
          isModalOpen: false,
          FILTER: item.FILTER,
          term: '1m'
        };
      })
      .filter(Boolean);

    setConfigData({
      nds: ndsValue,
      items: configs
    });
  }, []);

  const updateConfig = (index, newConfig) => {
    setConfigData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, config: newConfig } : item
      )
    }));
  };

  const updateTerm = (index, newTerm) => {
    setConfigData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, term: newTerm } : item
      )
    }));
  };

  const setIsModalOpen = (index, open) => {
    setConfigData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, isModalOpen: open } : item
      )
    }));
  };

  return (
    <div className={styles.App}>
      <div className={styles.container}>
        <Filter activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
        <div className={styles.rowMain}>
          {configData.items
            .filter(item => {
              if (!activeFilter) return true;
              if (!item.FILTER) return false;
              const filters = item.FILTER.split(' ');
              return filters.includes(activeFilter);
            })
            .map(item => (
              <Configurator
                key={item.id}
                item={item}
                configData={configData}
                updateConfig={updateConfig}
                updateTerm={updateTerm}
                setIsModalOpen={setIsModalOpen}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

export default App;