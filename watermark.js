(function (root,factory) {
  if (typeof define === 'function' && define.amd) {
    /*AMD. Register as an anonymous module.
    *define([], factory); */
    define([], factory());
  } else if (typeof module === 'object' && module.exports) {
    /*Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.*/
    module.exports = factory();

  } else {
    /*Browser globals (root is window)*/
    root['watermark'] = factory();
  }
}(this, function () {

/*Just return a value to define the module export.*/
const watermark = {}

let forceRemove = false

const defaultSettings = {
  id: 'wm_div_id',          //水印总体的id
  prefix: 'mask_div_id',    //小水印的id前缀
  txt: '测试水印',             //水印的内容
  x: 20,                     //水印起始位置x轴坐标
  y: 20,                     //水印起始位置Y轴坐标
  rows: 0,                   //水印行数
  cols: 0,                   //水印列数
  x_space: 50,              //水印x轴间隔
  y_space: 50,               //水印y轴间隔
  font: '微软雅黑',           //水印字体
  color: 'black',            //水印字体颜色
  fontsize: '18px',          //水印字体大小
  alpha: 0.15,               //水印透明度，要求设置在大于等于0.005
  width: 100,                //水印宽度
  height: 100,               //水印长度
  angle: 15,                 //水印倾斜度数
  parent_width: 0,      //水印的总体宽度（默认值：body的scrollWidth和clientWidth的较大值）
  parent_height: 0,     //水印的总体高度（默认值：body的scrollHeight和clientHeight的较大值）
  parent_node: null,     //水印插件挂载的父元素element,不输入则默认挂在body上
  monitor: true                   //monitor 是否监控， true: 不可删除水印; false: 可删水印。
}

const MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver

//监听dom是否被移除或者改变属性的回调函数
const domChangeCallback = function (records) {
  if (forceRemove) {
    forceRemove = false
    return
  }
  if ((globalSetting && records.length === 1) || records.length === 1 && records[0].removedNodes.length >= 1) {
    loadMark(globalSetting)
  }
}

const hasObserver = MutationObserver !== undefined
let watermarkDom = hasObserver ? new MutationObserver(domChangeCallback) : null
let option = {
  'childList': true,
  'attributes': true,
  'subtree': true
}

/*加载水印*/
function loadMark (settings) {
  /*采用配置项替换默认值，作用类似jquery.extend*/
  if (arguments.length === 1 && typeof arguments[0] === 'object') {
    const src = arguments[0] || {}
    for (const key in src) {
      if (src[key] && defaultSettings[key] && src[key] === defaultSettings[key]) continue
      /*veronic: resolution of angle=0 not in force*/
      else if (src[key] || src[key] === 0) defaultSettings[key] = src[key]
    }
  }

  /*如果元素存在则移除*/
  const element = document.getElementById(defaultSettings.id)
  element && element.parentNode && element.parentNode.removeChild(element)

  /*如果设置水印挂载的父元素的id*/
  const parent_element = document.getElementById(defaultSettings.parent_node)
  const hook_element = parent_element ? parent_element : document.body

  /*获取页面宽度*/
  const page_width = Math.max(hook_element.scrollWidth, hook_element.clientWidth)
  /*获取页面最大长度*/
  const page_height = Math.max(hook_element.scrollHeight, hook_element.clientHeight)

  const setting = arguments[0] || {}
  const parentEle = hook_element

  let page_offsetTop = 0
  let page_offsetLeft = 0
  if (setting.parent_width || setting.parent_height) {
    /*指定父元素同时指定了宽或高*/
    if (parentEle) {
      page_offsetTop = parentEle.offsetTop || 0
      page_offsetLeft = parentEle.offsetLeft || 0
      defaultSettings.x = defaultSettings.x + page_offsetLeft
      defaultSettings.y = defaultSettings.y + page_offsetTop
    }
  } else {
    if (parentEle) {
      page_offsetTop = parentEle.offsetTop || 0
      page_offsetLeft = parentEle.offsetLeft || 0
    }
  }

  /*创建水印外壳div*/
  let otdiv = document.getElementById(defaultSettings.id)
  let shadowRoot = null

  if (!otdiv) {
    otdiv = document.createElement('div')
    /*创建shadow dom*/
    otdiv.id = defaultSettings.id
    otdiv.setAttribute('style', 'pointer-events: none !important; display: block !important')
    /*判断浏览器是否支持attachShadow方法*/
    if (typeof otdiv.attachShadow === 'function') {
      /* createShadowRoot Deprecated. Not for use in new websites. Use attachShadow*/
      shadowRoot = otdiv.attachShadow({ mode: 'open' })
    } else {
      shadowRoot = otdiv
    }
    /*将shadow dom随机插入body内的任意位置*/
    const nodeList = hook_element.children
    const index = Math.floor(Math.random() * (nodeList.length - 1))
    if (nodeList[index]) {
      hook_element.insertBefore(otdiv, nodeList[index])
    } else {
      hook_element.appendChild(otdiv)
    }
  } else if (otdiv.shadowRoot) {
    shadowRoot = otdiv.shadowRoot
  }
  /*三种情况下会重新计算水印列数和x方向水印间隔：1、水印列数设置为0，2、水印宽度大于页面宽度，3、水印宽度小于于页面宽度*/
  defaultSettings.cols = parseInt(
    (page_width - defaultSettings.x) /
    (defaultSettings.width + defaultSettings.x_space)
    ) || 1; // fix 移动端无法正常显示水印
  const temp_x_space = parseInt((page_width - defaultSettings.x - defaultSettings.width * defaultSettings.cols) / (defaultSettings.cols))
  defaultSettings.x_space = temp_x_space ? defaultSettings.x_space : temp_x_space
  let allWatermarkWidth

  /*三种情况下会重新计算水印行数和y方向水印间隔：1、水印行数设置为0，2、水印长度大于页面长度，3、水印长度小于于页面长度*/
  defaultSettings.rows = parseInt((page_height - defaultSettings.y) / (defaultSettings.height + defaultSettings.y_space))
  const temp_y_space = parseInt((page_height - defaultSettings.y - defaultSettings.height * defaultSettings.rows) / (defaultSettings.rows))
  defaultSettings.y_space = temp_y_space ? defaultSettings.y_space : temp_y_space
  let allWatermarkHeight

  if (parent_element) {
    allWatermarkWidth = defaultSettings.x + defaultSettings.width * defaultSettings.cols + defaultSettings.x_space * (defaultSettings.cols - 1)
    allWatermarkHeight = defaultSettings.y + defaultSettings.height * defaultSettings.rows + defaultSettings.y_space * (defaultSettings.rows - 1)
  } else {
    allWatermarkWidth = page_offsetLeft + defaultSettings.x + defaultSettings.width * defaultSettings.cols + defaultSettings.x_space * (defaultSettings.cols - 1)
    allWatermarkHeight = page_offsetTop + defaultSettings.y + defaultSettings.height * defaultSettings.rows + defaultSettings.y_space * (defaultSettings.rows - 1)
  }

  let x
  let y
  for (let i = 0; i < defaultSettings.rows; i++) {
    if (parent_element) {
      y = page_offsetTop + defaultSettings.y + (page_height - allWatermarkHeight) / 2 + (defaultSettings.y_space + defaultSettings.height) * i
    } else {
      y = defaultSettings.y + (page_height - allWatermarkHeight) / 2 + (defaultSettings.y_space + defaultSettings.height) * i
    }
    for (let j = 0; j < defaultSettings.cols; j++) {
      if (parent_element) {
        x = page_offsetLeft + defaultSettings.x + (page_width - allWatermarkWidth) / 2 + (defaultSettings.width + defaultSettings.x_space) * j
      } else {
        x = defaultSettings.x + (page_width - allWatermarkWidth) / 2 + (defaultSettings.width + defaultSettings.x_space) * j
      }
      const mask_div = document.createElement('div')
      const txt = defaultSettings.txt
      // 新增支持多行数组
      if (!Array.isArray(txt))  {
        const oText = document.createTextNode(defaultSettings.txt)
        mask_div.appendChild(oText)
      } else {
        txt.forEach(t => {
          const oText = document.createElement('div')
          oText.innerText = t
          mask_div.appendChild(oText)
        })
      }
      /*设置水印相关属性start*/
      mask_div.id = defaultSettings.prefix + i + j
      /*设置水印div倾斜显示*/
      mask_div.style.webkitTransform = 'rotate(-' + defaultSettings.angle + 'deg)'
      mask_div.style.MozTransform = 'rotate(-' + defaultSettings.angle + 'deg)'
      mask_div.style.msTransform = 'rotate(-' + defaultSettings.angle + 'deg)'
      mask_div.style.OTransform = 'rotate(-' + defaultSettings.angle + 'deg)'
      mask_div.style.transform = 'rotate(-' + defaultSettings.angle + 'deg)'
      mask_div.style.visibility = ''
      mask_div.style.position = 'absolute'
      /*选不中*/
      mask_div.style.left = x + 'px'
      mask_div.style.top = y + 'px'
      mask_div.style.overflow = 'hidden'
      mask_div.style.zIndex = '9999999'
      mask_div.style.opacity = defaultSettings.alpha
      mask_div.style.fontSize = defaultSettings.fontsize
      mask_div.style.fontFamily = defaultSettings.font
      mask_div.style.color = defaultSettings.color
      mask_div.style.textAlign = 'center'
      mask_div.style.width = defaultSettings.width + 'px'
      mask_div.style.height = defaultSettings.height + 'px'
      mask_div.style.display = 'block'
      mask_div.style['-ms-user-select'] = 'none'
      /*设置水印相关属性end*/
      shadowRoot.appendChild(mask_div)
    }
  }

  // monitor 是否监控， true: 不可删除水印; false: 可删水印。
  const minotor = settings.monitor === undefined ? defaultSettings.monitor : settings.monitor
  if (minotor && hasObserver) {
    watermarkDom.observe(hook_element, option)
    watermarkDom.observe(document.getElementById(defaultSettings.id).shadowRoot, option)
  }
}

/*移除水印*/
function removeMark () {
  /*采用配置项替换默认值，作用类似jquery.extend*/
  if (arguments.length === 1 && typeof arguments[0] === 'object') {
    const src = arguments[0] || {}
    for (let key in src) {
      if (src[key] && defaultSettings[key] && src[key] === defaultSettings[key]) continue
      /*veronic: resolution of angle=0 not in force*/
      else if (src[key] || src[key] === 0) defaultSettings[key] = src[key]
    }
  }

  /*移除水印*/
  const element = document.getElementById(defaultSettings.id)

  element && element.parentNode.removeChild(element)
  // :ambulance: remove()
  // minotor 这个配置有些冗余
  // 如果用 MutationObserver 来监听dom变化防止删除水印
  // remove() 方法里用 MutationObserver 的 disconnect() 解除监听即可
  watermarkDom.disconnect()
  // 修复移除后缩放屏幕水印重新加载Bug
  window.removeEventListener('onload', loadMark)
  window.removeEventListener('resize', loadMark)
}

let globalSetting
/*初始化水印，添加load和resize事件*/
watermark.init = function (settings) {
  globalSetting = settings
  loadMark(settings)
  window.addEventListener('onload', loadMark)
  window.addEventListener('resize', loadMark)
}

/*手动加载水印*/
watermark.load = function (settings) {
  globalSetting = settings
  loadMark(settings)
}

/*手动移除水印*/
watermark.remove = function () {
  forceRemove = true
  removeMark()
}


//监听dom是否被移除或者改变属性的回调函数
function callback (records) {
  if ((globalSetting && records.length === 1) || records.length === 1 && records[0].removedNodes.length >= 1) {
    loadMark(globalSetting)
    return
  }

  // 监听父节点的尺寸是否发生了变化, 如果发生改变, 则进行重新绘制
  const parent_element = document.getElementById(defaultSettings.parent_node)
  if (parent_element) {
    const newWidth = getComputedStyle(parent_element).getPropertyValue('width')
    const newHeight = getComputedStyle(parent_element).getPropertyValue('height')
    if (newWidth !== recordOldValue.width || newHeight !== recordOldValue.height) {
      recordOldValue.width = newWidth
      recordOldValue.height = newHeight
      loadMark(globalSetting)
    }
  }
}

watermarkDom = new MutationObserver(callback)

option = {
  'childList': true,
  'attributes': true,
  'subtree': true,
  'attributeFilter': ['style'],
  'attributeOldValue': true
}
const recordOldValue = {
  width: 0,
  height: 0
}

return watermark
}));
