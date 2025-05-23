// 表格列宽调整辅助工具
// 在public/index.html中已添加基础功能，这里提供手动调用的接口

export function initResizableColumns() {
  // 如果全局已存在此函数，则直接调用
  if (typeof window !== 'undefined' && typeof window.initResizableTable === 'function') {
    window.initResizableTable();
    return true;
  }

  return false;
}

// 添加列宽调整的DOM监听器
export function addResizeListeners() {
  // 使用MutationObserver监听DOM变化，当表格出现时自动初始化
  if (typeof window !== 'undefined' && typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          // 检查是否有新的表格被添加
          const tables = document.querySelectorAll('.job-table');
          if (tables.length > 0) {
            // 延迟执行以确保DOM完全加载
            setTimeout(() => {
              if (typeof window.initResizableTable === 'function') {
                window.initResizableTable();
                setupFrozenColumns(); // 设置冻结列
              }
            }, 200);
          }
        }
      });
    });

    // 开始监听整个文档的变化
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    return observer;
  }

  return null;
}

// 手动设置列宽
export function setColumnWidth(tableSelector, columnIndex, width) {
  const tables = document.querySelectorAll(tableSelector);
  tables.forEach(table => {
    const thElements = table.querySelectorAll('th');
    if (thElements.length > columnIndex) {
      thElements[columnIndex].style.width = `${width}px`;
      thElements[columnIndex].style.minWidth = `${width}px`;

      // 更新第二列的位置（如果调整的是第一列）
      if (columnIndex === 0) {
        updateSecondColumnPosition(table, width);
      }
    }
  });
}

// 设置冻结列
export function setupFrozenColumns() {
  const tables = document.querySelectorAll('.job-table');
  tables.forEach(table => {
    // 确保表格容器设置了overflow-x: auto
    const tableContainer = table.closest('.table-responsive');
    if (tableContainer) {
      tableContainer.style.overflow = 'auto';
      tableContainer.style.position = 'relative';
    }

    // 强制设置第一列样式（操作列）
    const firstColumnHeaders = table.querySelectorAll('th:first-child');
    const firstColumnCells = table.querySelectorAll('td:first-child, .action-column');

    [...firstColumnHeaders, ...firstColumnCells].forEach(cell => {
      cell.style.position = 'sticky';
      cell.style.left = '0';
      cell.style.zIndex = '50';
      cell.style.backgroundColor = '#f8fafc';
      cell.style.boxShadow = '2px 0 5px -2px rgba(0,0,0,0.1)';
      // 设置固定宽度
      cell.style.width = '235px';
      cell.style.minWidth = '235px';
      cell.style.maxWidth = '235px';
    });

    // 计算第一列的宽度
    let firstColumnWidth = 235; // 将默认宽度从180调整为235
    const firstColumn = table.querySelector('th:first-child');
    if (firstColumn) {
      firstColumnWidth = firstColumn.offsetWidth;
    }

    // 强制设置第二列样式
    const secondColumnHeaders = table.querySelectorAll('th:nth-child(2)');
    const secondColumnCells = table.querySelectorAll('td:nth-child(2)');

    [...secondColumnHeaders, ...secondColumnCells].forEach(cell => {
      cell.style.position = 'sticky';
      cell.style.left = `${firstColumnWidth}px`;
      cell.style.zIndex = '49';
      cell.style.backgroundColor = '#f8fafc';
      cell.style.boxShadow = '2px 0 5px -2px rgba(0,0,0,0.1)';
      cell.style.width = '200px';
      cell.style.minWidth = '200px';
      cell.style.maxWidth = '200px';
      cell.style.overflow = 'hidden';
      cell.style.textOverflow = 'ellipsis';
      cell.style.whiteSpace = 'nowrap';
    });

    // 强制设置第三列样式
    const thirdColumnHeaders = table.querySelectorAll('th:nth-child(3)');
    const thirdColumnCells = table.querySelectorAll('td:nth-child(3)');

    [...thirdColumnHeaders, ...thirdColumnCells].forEach(cell => {
      cell.style.position = 'sticky';
      cell.style.left = `${firstColumnWidth + 200}px`; // 第一列宽度 + 第二列宽度
      cell.style.zIndex = '48';
      cell.style.backgroundColor = '#f8fafc';
      cell.style.boxShadow = '2px 0 5px -2px rgba(0,0,0,0.1)';
      cell.style.width = '200px';
      cell.style.minWidth = '200px';
      cell.style.maxWidth = '200px';
      cell.style.overflow = 'hidden';
      cell.style.textOverflow = 'ellipsis';
      cell.style.whiteSpace = 'nowrap';
    });

    // 监听表格滚动事件
    if (tableContainer) {
      tableContainer.addEventListener('scroll', function() {
        // 滚动时更新冻结列的阴影效果
        const isScrolled = this.scrollLeft > 0;
        [...firstColumnHeaders, ...firstColumnCells].forEach(cell => {
          cell.style.boxShadow = isScrolled ? '2px 0 5px -2px rgba(0,0,0,0.1)' : 'none';
        });

        // 滚动时更新第二列的样式
        [...secondColumnHeaders, ...secondColumnCells].forEach(cell => {
          cell.style.boxShadow = isScrolled ? '2px 0 5px -2px rgba(0,0,0,0.1)' : 'none';
          cell.style.position = 'sticky';
          cell.style.left = `${firstColumnWidth}px`;
        });

        // 滚动时更新第三列的样式
        const thirdColumnHeaders = table.querySelectorAll('th:nth-child(3)');
        const thirdColumnCells = table.querySelectorAll('td:nth-child(3)');
        [...thirdColumnHeaders, ...thirdColumnCells].forEach(cell => {
          cell.style.boxShadow = isScrolled ? '2px 0 5px -2px rgba(0,0,0,0.1)' : 'none';
          cell.style.position = 'sticky';
          cell.style.left = `${firstColumnWidth + 200}px`;
        });
      });
    }
  });
}

// 更新第二列的位置
function updateSecondColumnPosition(table, firstColumnWidth) {
  // 优先查找action-column类
  const actionColumns = table.querySelectorAll('.action-column');
  if (actionColumns.length > 0) {
    // 使用实际的action-column宽度
    firstColumnWidth = actionColumns[0].offsetWidth;
  }

  const secondColumnHeaders = table.querySelectorAll('th:nth-child(2)');
  const secondColumnCells = table.querySelectorAll('td:nth-child(2)');

  // 设置第二列的左侧位置为第一列的宽度
  [...secondColumnHeaders, ...secondColumnCells].forEach(cell => {
    cell.style.position = 'sticky';
    cell.style.left = `${firstColumnWidth}px`;
    cell.style.zIndex = '19';
  });
}

// 调整表格视觉效果
export function enhanceTable(tableSelector) {
  const tables = document.querySelectorAll(tableSelector);
  tables.forEach(table => {
    table.style.tableLayout = 'fixed';

    // 设置每列的初始宽度（如果有data-width属性）
    const thElements = table.querySelectorAll('th');
    thElements.forEach(th => {
      const initialWidth = th.getAttribute('data-width');
      if (initialWidth) {
        th.style.width = initialWidth;
        th.style.minWidth = initialWidth;
      }
    });

    // 设置冻结列
    setupFrozenColumns();
  });
}

// 初始化一个表格的所有调整功能
export function setupTableWithResizableColumns(tableSelector) {
  enhanceTable(tableSelector);

  // 确保全局函数可用再调用，延长等待时间
  setTimeout(() => {
    if (typeof window.initResizableTable === 'function') {
      window.initResizableTable();
      // 设置冻结列
      setupFrozenColumns();
      // 直接处理操作列
      freezeActionColumn();

      // 再添加一个延迟调用，确保所有列都能拖拽调整
      setTimeout(() => {
        window.initResizableTable();
      }, 500);
    }
  }, 800);

  return true;
}

// 专门冻结操作列
export function freezeActionColumn() {
  // 找到所有操作列单元格
  const actionCells = document.querySelectorAll('.action-column');

  if (actionCells.length > 0) {
    // 直接设置固定位置样式 - 使用更强的内联样式
    actionCells.forEach(cell => {
      Object.assign(cell.style, {
        position: 'sticky',
        left: '0',
        zIndex: '50',
        backgroundColor: '#f8fafc',
        boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)',
        borderRight: '2px solid #e2e8f0',
        width: '235px',
        minWidth: '235px',
        maxWidth: '235px'
      });
    });

    // 计算操作列宽度，更新第二列位置
    const tables = document.querySelectorAll('.job-table');
    tables.forEach(table => {
      // 固定操作列的宽度
      const actionWidth = 235;
      const companyColumnWidth = 200; // 公司列宽度
      const positionColumnWidth = 200; // 岗位列宽度

      // 强制设置操作列宽度
      const firstCells = table.querySelectorAll('th:first-child, td:first-child');
      firstCells.forEach(cell => {
        Object.assign(cell.style, {
          position: 'sticky',
          left: '0',
          zIndex: '50',
          backgroundColor: '#f8fafc',
          boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)',
          borderRight: '2px solid #e2e8f0',
          width: `${actionWidth}px`,
          minWidth: `${actionWidth}px`,
          maxWidth: `${actionWidth}px`
        });
      });

      // 为第二列设置固定宽度和位置
      const secondCells = table.querySelectorAll('th:nth-child(2), td:nth-child(2)');
      secondCells.forEach(cell => {
        Object.assign(cell.style, {
          position: 'sticky',
          left: `${actionWidth}px`,
          zIndex: '49',
          backgroundColor: '#f8fafc',
          boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)',
          borderRight: '2px solid #e2e8f0',
          width: `${companyColumnWidth}px`,
          minWidth: `${companyColumnWidth}px`,
          maxWidth: `${companyColumnWidth}px`,
          boxSizing: 'border-box',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        });
      });

      // 为第三列设置固定宽度和位置
      const thirdCells = table.querySelectorAll('th:nth-child(3), td:nth-child(3)');
      thirdCells.forEach(cell => {
        Object.assign(cell.style, {
          position: 'sticky',
          left: `${actionWidth + companyColumnWidth}px`,
          zIndex: '48',
          backgroundColor: '#f8fafc',
          boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)',
          borderRight: '2px solid #e2e8f0',
          width: `${positionColumnWidth}px`,
          minWidth: `${positionColumnWidth}px`,
          maxWidth: `${positionColumnWidth}px`,
          boxSizing: 'border-box',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        });
      });

      // 创建强力分隔线，并确保它跟随滚动
      addColumnDivider(table, actionWidth, companyColumnWidth, positionColumnWidth);
    });

    // 处理滚动事件 - 频繁更新
    setupScrollHandlers();
  }
}

// 添加分隔线
function addColumnDivider(table, actionWidth, companyColumnWidth = 200, positionColumnWidth = 200) {
  const tableContainer = table.closest('.table-responsive');
  if (!tableContainer) return;

  // 移除旧的分隔线
  const oldDividers = document.querySelectorAll('.column-divider');
  oldDividers.forEach(div => div.remove());

  // 创建操作列和公司列之间的分隔线
  const divider1 = document.createElement('div');
  Object.assign(divider1.style, {
    position: 'absolute',
    top: '0',
    left: `${actionWidth}px`,
    height: '100%',
    width: '2px',
    backgroundColor: '#cbd5e1',
    zIndex: '100',
    pointerEvents: 'none'
  });
  divider1.className = 'column-divider divider-1';

  // 创建公司列和岗位列之间的分隔线
  const divider2 = document.createElement('div');
  Object.assign(divider2.style, {
    position: 'absolute',
    top: '0',
    left: `${actionWidth + companyColumnWidth}px`, // 操作列 + 公司列宽度
    height: '100%',
    width: '2px',
    backgroundColor: '#cbd5e1',
    zIndex: '100',
    pointerEvents: 'none'
  });
  divider2.className = 'column-divider divider-2';

  // 创建岗位列之后的分隔线
  const divider3 = document.createElement('div');
  Object.assign(divider3.style, {
    position: 'absolute',
    top: '0',
    left: `${actionWidth + companyColumnWidth + positionColumnWidth}px`, // 操作列 + 公司列宽度 + 岗位列宽度
    height: '100%',
    width: '2px',
    backgroundColor: '#cbd5e1',
    zIndex: '100',
    pointerEvents: 'none'
  });
  divider3.className = 'column-divider divider-3';

  // 添加到容器
  tableContainer.appendChild(divider1);
  tableContainer.appendChild(divider2);
  tableContainer.appendChild(divider3);

  // 记录初始位置，用于滚动处理
  tableContainer.dataset.divider1Left = actionWidth;
  tableContainer.dataset.divider2Left = actionWidth + companyColumnWidth;
  tableContainer.dataset.divider3Left = actionWidth + companyColumnWidth + positionColumnWidth;
}

// 设置更强的滚动处理
function setupScrollHandlers() {
  const tableContainers = document.querySelectorAll('.table-responsive');

  tableContainers.forEach(container => {
    // 移除旧的事件监听器
    container.removeEventListener('scroll', handleScrollEvent);

    // 添加新的滚动事件处理
    container.addEventListener('scroll', handleScrollEvent);

    // 立即执行一次，确保正确初始化
    handleScrollEvent.call(container);
  });
}

// 滚动事件处理函数 - 使用requestAnimationFrame优化性能
let scrollFrameRequested = false;
function handleScrollEvent() {
  const container = this;

  if (!scrollFrameRequested) {
    scrollFrameRequested = true;

    requestAnimationFrame(() => {
      // 重新固定第一列宽度
      const actionCells = container.querySelectorAll('.action-column, th:first-child, td:first-child');
      actionCells.forEach(cell => {
        cell.style.width = '235px';
        cell.style.minWidth = '235px';
        cell.style.maxWidth = '235px';
        cell.style.position = 'sticky';
        cell.style.left = '0';
        cell.style.zIndex = '50';
      });

      // 重新固定第二列宽度和位置
      const companyCells = container.querySelectorAll('th:nth-child(2), td:nth-child(2)');
      companyCells.forEach(cell => {
        cell.style.position = 'sticky';
        cell.style.left = '235px';
        cell.style.width = '200px';
        cell.style.minWidth = '200px';
        cell.style.maxWidth = '200px';
        cell.style.zIndex = '49';
        cell.style.backgroundColor = '#f8fafc';
        cell.style.boxShadow = '2px 0 5px -2px rgba(0,0,0,0.1)';
      });

      // 重新固定第三列宽度和位置
      const positionCells = container.querySelectorAll('th:nth-child(3), td:nth-child(3)');
      positionCells.forEach(cell => {
        cell.style.position = 'sticky';
        cell.style.left = '435px'; // 235px + 200px
        cell.style.width = '200px';
        cell.style.minWidth = '200px';
        cell.style.maxWidth = '200px';
        cell.style.zIndex = '48';
        cell.style.backgroundColor = '#f8fafc';
        cell.style.boxShadow = '2px 0 5px -2px rgba(0,0,0,0.1)';
      });

      // 更新分隔线位置
      const divider1 = container.querySelector('.divider-1');
      const divider2 = container.querySelector('.divider-2');
      const divider3 = container.querySelector('.divider-3');

      if (divider1) {
        divider1.style.left = '235px';
      }

      if (divider2) {
        divider2.style.left = '435px'; // 235px + 200px
      }

      if (divider3) {
        divider3.style.left = '635px'; // 235px + 200px + 200px
      }

      scrollFrameRequested = false;
    });
  }
}