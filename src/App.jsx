import { useState, useEffect, useRef } from 'react'
import './App.css'

// 安全获取颜色值
const safeColor = (color, fallback = '#4CAF50') => {
  if (typeof color === 'string' && /^#[0-9A-Fa-f]{3,8}$/.test(color)) {
    return color
  }
  return fallback
}

// 学习模式枚举
const LearningMode = {
  OVERVIEW: 'overview',      // 总览模式
  CARD: 'card',              // 闪卡模式
  LISTEN: 'listen',          // 语音学习
  QUIZ: 'quiz',              // 测验模式
  PROGRESS: 'progress',      // 进度查看
  DATA_EDIT: 'dataEdit'      // 数据编辑
}

function App() {
  const [currentTab, setCurrentTab] = useState(LearningMode.OVERVIEW)
  const [loadedProducts, setLoadedProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0)
  const [quizAnswer, setQuizAnswer] = useState(null)
  const [quizScore, setQuizScore] = useState(0)
  const [learnedCards, setLearnedCards] = useState([])
  const [speechSynthesis, setSpeechSynthesis] = useState(null)
  const [browserSupport, setBrowserSupport] = useState({ speech: true, isWeChat: false })
  const [showBrowserTip, setShowBrowserTip] = useState(false)
  const speechRef = useRef(null)

  // 加载产品数据
  useEffect(() => {
    fetch('/products-data.json')
      .then(response => response.json())
      .then(data => {
        setLoadedProducts(data.products || [])
        if (data.products && data.products.length > 0) {
          setSelectedProduct(data.products[0])
        }
      })
      .catch(error => {
        console.error('加载产品数据失败:', error)
        // 如果加载失败，使用本地默认数据
        const saved = localStorage.getItem('customProducts')
        if (saved) {
          const customData = JSON.parse(saved)
          setLoadedProducts(customData)
          if (customData.length > 0) {
            setSelectedProduct(customData[0])
          }
        }
      })
  }, [])

  // 检测浏览器类型和支持情况
  const checkBrowserSupport = () => {
    const ua = navigator.userAgent.toLowerCase()
    const isWeChat = ua.indexOf('micromessenger') !== -1
    const isQQ = ua.indexOf('qq/') !== -1
    const speechSupported = 'speechSynthesis' in window && !isWeChat && !isQQ

    return {
      speech: speechSupported,
      isWeChat: isWeChat,
      isQQ: isQQ,
      browserName: isWeChat ? '微信浏览器' : isQQ ? 'QQ浏览器' : '其他浏览器'
    }
  }

  useEffect(() => {
    // 检测浏览器支持情况
    const support = checkBrowserSupport()
    setBrowserSupport(support)

    // 初始化语音合成（仅在支持的浏览器中）
    if (support.speech && 'speechSynthesis' in window) {
      setSpeechSynthesis(window.speechSynthesis)
    }

    // 加载学习进度
    const saved = localStorage.getItem('learnedCards')
    if (saved) {
      setLearnedCards(JSON.parse(saved))
    }
  }, [])

  // 保存学习进度
  useEffect(() => {
    localStorage.setItem('learnedCards', JSON.stringify(learnedCards))
  }, [learnedCards])

  // 复制文本到剪贴板（微信浏览器替代方案）
  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        alert('✅ 内容已复制到剪贴板！\n\n您可以粘贴到其他应用中使用语音朗读。')
      } else {
        // 降级方案：使用传统方法
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        alert('✅ 内容已复制！\n\n您可以粘贴到其他应用中使用语音朗读。')
      }
    } catch (err) {
      console.error('复制失败:', err)
      alert('❌ 复制失败，请手动复制内容')
    }
  }

  // 文本转语音（兼容微信浏览器）
  const speak = (text) => {
    // 检测浏览器支持
    if (!browserSupport.speech) {
      if (browserSupport.isWeChat || browserSupport.isQQ) {
        setShowBrowserTip(true)
        // 提供替代方案：复制文本
        copyToClipboard(text)
      } else {
        alert('当前浏览器不支持语音功能\n\n建议使用Chrome或Safari浏览器')
      }
      return
    }

    if (!speechSynthesis) {
      alert('语音功能未初始化')
      return
    }

    // 停止之前的语音
    speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.9
    utterance.pitch = 1.0

    speechRef.current = utterance
    speechSynthesis.speak(utterance)
    setIsPlaying(true)

    utterance.onend = () => {
      setIsPlaying(false)
    }

    utterance.onerror = () => {
      setIsPlaying(false)
      alert('语音播放出错，请重试')
    }
  }

  const stopSpeaking = () => {
    if (speechSynthesis && browserSupport.speech) {
      speechSynthesis.cancel()
      setIsPlaying(false)
    }
  }

  // 语音播报内容
  const speakProductContent = () => {
    if (!selectedProduct) return

    const content = `${selectedProduct.name}。${selectedProduct.sections.map(s => 
      `${s.title}：${s.content}`
    ).join('。')}`

    speak(content)
  }

  // 翻转卡片
  const flipCard = () => {
    setIsFlipped(!isFlipped)
    if (!isFlipped) {
      // 标记为已学习
      const cardKey = `${selectedProduct.id}-${currentCardIndex}`
      if (!learnedCards.includes(cardKey)) {
        setLearnedCards([...learnedCards, cardKey])
      }
    }
  }

  // 下一张卡片
  const nextCard = () => {
    setCurrentCardIndex((prev) => {
      const maxIndex = selectedProduct.sections.length - 1
      return prev < maxIndex ? prev + 1 : 0
    })
    setIsFlipped(false)
  }

  // 上一张卡片
  const prevCard = () => {
    setCurrentCardIndex((prev) => {
      const maxIndex = selectedProduct.sections.length - 1
      return prev > 0 ? prev - 1 : maxIndex
    })
    setIsFlipped(false)
  }

  // 生成测验题
  const generateQuiz = (productData) => {
    if (!productData || productData.length === 0) return []
    const quizzes = []
    productData.forEach(product => {
      product.sections.forEach(section => {
        quizzes.push({
          productName: product.name,
          question: `以下哪项是关于${product.shortName}的${section.title}？`,
          answer: section.content.split('\n')[0],
          options: generateOptions(section.content, product.shortName, productData)
        })
      })
    })
    return shuffleArray(quizzes)
  }

  const generateOptions = (answer, productName, productData) => {
    const options = [answer]
    const otherAnswers = productData
      .filter(p => p.shortName !== productName)
      .flatMap(p => p.sections)
      .map(s => s.content.split('\n')[0])
    
    while (options.length < 4 && otherAnswers.length > 0) {
      const randomIndex = Math.floor(Math.random() * otherAnswers.length)
      const option = otherAnswers.splice(randomIndex, 1)[0]
      if (!options.includes(option)) {
        options.push(option)
      }
    }
    
    return shuffleArray(options)
  }

  const shuffleArray = (array) => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  const [quizzes, setQuizzes] = useState([])

  // 当产品数据加载完成后生成测验题
  useEffect(() => {
    if (loadedProducts && loadedProducts.length > 0) {
      setQuizzes(generateQuiz(loadedProducts))
    }
  }, [loadedProducts])

  const handleQuizAnswer = (selectedAnswer) => {
    setQuizAnswer(selectedAnswer)
    if (selectedAnswer === quizzes[currentQuizIndex].answer) {
      setQuizScore(quizScore + 1)
    }
  }

  const nextQuiz = () => {
    setCurrentQuizIndex((prev) => prev < quizzes.length - 1 ? prev + 1 : 0)
    setQuizAnswer(null)
  }

  // 渲染总览模式
  const renderOverview = () => {
    if (!selectedProduct) {
      return <div className="overview"><p>正在加载产品数据...</p></div>
    }
    return (
    <div className="overview">
      <div className="product-grid">
        {loadedProducts.map(product => (
          <div
            key={product.id}
            className={`product-card ${selectedProduct && selectedProduct.id === product.id ? 'active' : ''}`}
            onClick={() => setSelectedProduct(product)}
            style={{ borderLeftColor: safeColor(product.color) }}
          >
            <div className="product-icon">{product.icon}</div>
            <div className="product-info">
              <h3>{product.shortName}</h3>
              <p>{product.name}</p>
              <div className="product-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(product.sections.filter((s, i) =>
                        learnedCards.includes(`${product.id}-${i}`)
                      ).length / product.sections.length) * 100}%`,
                      backgroundColor: safeColor(product.color)
                    }}
                  />
                </div>
                <span className="progress-text">
                  {product.sections.filter((s, i) =>
                    learnedCards.includes(`${product.id}-${i}`)
                  ).length}/{product.sections.length}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="selected-product-detail">
        <h2 style={{ color: selectedProduct.color }}>
          {selectedProduct.icon} {selectedProduct.name}
        </h2>

        <div className="section-list">
          {selectedProduct.sections.map((section, index) => (
            <div key={index} className="section-item">
              <h3>{section.title}</h3>
              <div className="section-content">
                {section.content.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
              <div className="section-keywords">
                {section.keywords.map((kw, i) => (
                  <span key={i} className="keyword-tag">{kw}</span>
                ))}
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => speak(section.content)}
                style={{ marginTop: '8px' }}
              >
                🔊 语音播放
              </button>
            </div>
          ))}
        </div>

        <button
          className="btn btn-primary btn-full"
          onClick={speakProductContent}
          style={{ marginTop: '20px' }}
        >
          🔊 完整语音播报
        </button>
      </div>
    </div>
    )
  }

  // 渲染闪卡模式
  const renderCard = () => {
    if (!selectedProduct) {
      return <div className="card-mode"><p>正在加载产品数据...</p></div>
    }
    const currentSection = selectedProduct.sections[currentCardIndex]

    return (
      <div className="card-mode">
        <div className="card-header">
          <h2>{selectedProduct.shortName} - 闪卡学习</h2>
          <span className="card-counter">
            {currentCardIndex + 1} / {selectedProduct.sections.length}
          </span>
        </div>

        <div className={`flashcard ${isFlipped ? 'flipped' : ''}`} onClick={flipCard}>
          <div className="flashcard-front">
            <div className="flashcard-icon">{selectedProduct.icon}</div>
            <h3>{currentSection.title}</h3>
            <p>点击卡片查看答案</p>
          </div>
          <div className="flashcard-back">
            <div className="flashcard-icon">{selectedProduct.icon}</div>
            <h3>{currentSection.title}</h3>
            <div className="flashcard-content">
              {currentSection.content.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        </div>

        <div className="card-controls">
          <button className="btn btn-secondary" onClick={prevCard}>
            ← 上一张
          </button>
          <button className="btn btn-primary" onClick={() => speak(currentSection.content)}>
            🔊 朗读
          </button>
          <button className="btn btn-secondary" onClick={nextCard}>
            下一张 →
          </button>
        </div>

        <div className="card-navigation">
          {selectedProduct.sections.map((section, index) => (
            <button
              key={index}
              className={`nav-dot ${index === currentCardIndex ? 'active' : ''} ${
                learnedCards.includes(`${selectedProduct.id}-${index}`) ? 'learned' : ''
              }`}
              onClick={() => {
                setCurrentCardIndex(index)
                setIsFlipped(false)
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  // 渲染语音学习模式
  const renderListen = () => {
    if (!selectedProduct) {
      return <div className="listen-mode"><p>正在加载产品数据...</p></div>
    }
    return (
    <div className="listen-mode">
      <div className="listen-header">
        <h2>🔊 语音学习模式</h2>
        <p>适合驾驶或休息时收听</p>
      </div>

      {/* 浏览器兼容提示 */}
      {!browserSupport.speech && (
        <div className="browser-warning">
          <div className="warning-icon">⚠️</div>
          <div className="warning-content">
            <h3>浏览器兼容提示</h3>
            <p>当前浏览器：{browserSupport.browserName}</p>
            <p>微信/QQ浏览器不支持语音播放功能</p>
            <div className="warning-solutions">
              <p><strong>解决方案：</strong></p>
              <ul>
                <li>✅ 点击"复制文本"，粘贴到其他语音应用</li>
                <li>✅ 使用Chrome或Safari浏览器打开</li>
                <li>✅ 在微信中点击右上角，选择"在浏览器中打开"</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="product-selector">
        <label>选择产品：</label>
        <div className="product-buttons">
          {loadedProducts.map(product => (
            <button
              key={product.id}
              className={`btn ${selectedProduct && selectedProduct.id === product.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedProduct(product)}
            >
              {product.icon} {product.shortName}
            </button>
          ))}
        </div>
      </div>

      <div className="voice-controls">
        <button
          className={`btn btn-primary btn-large ${isPlaying ? 'playing' : ''}`}
          onClick={isPlaying ? stopSpeaking : speakProductContent}
        >
          {browserSupport.speech ? (isPlaying ? '⏸ 暂停播放' : '▶ 开始播放') : '📋 复制文本'}
        </button>

        <div className="playback-info">
          {isPlaying && <p>正在播放：{selectedProduct.name}</p>}
          {browserSupport.speech && <p>播放速度：正常</p>}
          {!browserSupport.speech && <p>文本将复制到剪贴板，可粘贴到语音应用</p>}
        </div>
      </div>

      <div className="section-selector">
        <h3>{browserSupport.speech ? '分章节播放：' : '分章节复制：'}</h3>
        {selectedProduct.sections.map((section, index) => (
          <button
            key={index}
            className="btn btn-secondary btn-full"
            onClick={() => speak(`${section.title}。${section.content}`)}
            style={{ marginBottom: '8px' }}
          >
            {browserSupport.speech ? '🔊' : '📋'} {index + 1}. {section.title}
          </button>
        ))}
      </div>

      <div className="tips">
        <h3>💡 使用技巧</h3>
        {browserSupport.speech ? (
          <ul>
            <li>开车时可将手机放在一旁，语音自动播报</li>
            <li>点击章节可单独播放特定内容</li>
            <li>重复播放加强记忆效果</li>
          </ul>
        ) : (
          <ul>
            <li>点击"复制文本"按钮，内容将复制到剪贴板</li>
            <li>粘贴到手机语音助手（如讯飞、百度语音）</li>
            <li>建议在Chrome或Safari浏览器中使用</li>
            <li>微信中点击右上角 → 在浏览器中打开</li>
          </ul>
        )}
      </div>
    </div>
    )
  }

  // 渲染测验模式
  const renderQuiz = () => {
    const currentQuiz = quizzes[currentQuizIndex]

    return (
      <div className="quiz-mode">
        <div className="quiz-header">
          <h2>📝 知识测验</h2>
          <div className="quiz-stats">
            <span>得分：{quizScore}</span>
            <span>进度：{currentQuizIndex + 1}/{quizzes.length}</span>
          </div>
        </div>

        <div className="quiz-card">
          <div className="quiz-question">
            <p>{currentQuiz.question}</p>
          </div>

          <div className="quiz-options">
            {currentQuiz.options.map((option, index) => (
              <button
                key={index}
                className={`quiz-option ${
                  quizAnswer
                    ? option === currentQuiz.answer
                      ? 'correct'
                      : option === quizAnswer
                      ? 'wrong'
                      : ''
                    : ''
                }`}
                onClick={() => !quizAnswer && handleQuizAnswer(option)}
                disabled={!!quizAnswer}
              >
                {String.fromCharCode(65 + index)}. {option}
              </button>
            ))}
          </div>

          {quizAnswer && (
            <div className="quiz-feedback">
              <p className={quizAnswer === currentQuiz.answer ? 'correct' : 'wrong'}>
                {quizAnswer === currentQuiz.answer ? '✓ 回答正确！' : '✗ 回答错误'}
              </p>
              <button className="btn btn-primary" onClick={nextQuiz}>
                {currentQuizIndex < quizzes.length - 1 ? '下一题' : '重新开始'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 渲染进度模式
  const renderProgress = () => {
    const totalCards = loadedProducts.reduce((sum, p) => sum + p.sections.length, 0)
    const learnedCount = learnedCards.length
    const progressPercent = totalCards > 0 ? Math.round((learnedCount / totalCards) * 100) : 0

    return (
      <div className="progress-mode">
        <div className="progress-header">
          <h2>📊 学习进度</h2>
          <div className="overall-progress">
            <div className="progress-circle">
              <svg viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#e0e0e0"
                  strokeWidth="10"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#4CAF50"
                  strokeWidth="10"
                  strokeDasharray={`${progressPercent * 2.83} 283`}
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="progress-text">
                <span className="percent">{progressPercent}%</span>
                <span className="label">完成度</span>
              </div>
            </div>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{learnedCount}</div>
            <div className="stat-label">已学习卡片</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{totalCards}</div>
            <div className="stat-label">总卡片数</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{loadedProducts.length}</div>
            <div className="stat-label">产品数量</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{quizScore}</div>
            <div className="stat-label">测验得分</div>
          </div>
        </div>

        <div className="product-progress-list">
          <h3>各产品学习进度</h3>
          {loadedProducts.map(product => {
            const learned = product.sections.filter((s, i) =>
              learnedCards.includes(`${product.id}-${i}`)
            ).length
            const total = product.sections.length

            return (
              <div key={product.id} className="product-progress-item">
                <div className="product-progress-header">
                  <span>{product.icon} {product.shortName}</span>
                  <span>{learned}/{total}</span>
                </div>
                <div className="product-progress-bar">
                  <div
                    className="product-progress-fill"
                    style={{
                      width: `${total > 0 ? (learned / total) * 100 : 0}%`,
                      backgroundColor: safeColor(product.color)
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <button
          className="btn btn-secondary btn-full"
          onClick={() => setLearnedCards([])}
          style={{ marginTop: '20px' }}
        >
          🔄 重置学习进度
        </button>
      </div>
    )
  }

  // 数据编辑模式
  const [editingProducts, setEditingProducts] = useState([])

  // 当 loadedProducts 加载完成后，初始化 editingProducts
  useEffect(() => {
    if (loadedProducts && loadedProducts.length > 0) {
      setEditingProducts(loadedProducts)
    }
  }, [loadedProducts])
  const [editingProductId, setEditingProductId] = useState(null)
  const [editingSectionIndex, setEditingSectionIndex] = useState(null)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [newProduct, setNewProduct] = useState({
    name: '',
    shortName: '',
    icon: '📦',
    color: '#4CAF50',
    sections: []
  })
  const [newSection, setNewSection] = useState({
    title: '',
    content: '',
    keywords: ''
  })

  const saveProducts = () => {
    localStorage.setItem('customProducts', JSON.stringify(editingProducts))
    alert('✅ 数据已保存！')
  }

  const loadProducts = () => {
    const saved = localStorage.getItem('customProducts')
    if (saved) {
      setEditingProducts(JSON.parse(saved))
      alert('✅ 数据已加载！')
    } else {
      alert('⚠️ 没有找到保存的数据')
    }
  }

  const addProduct = () => {
    if (!newProduct.name || !newProduct.shortName) {
      alert('请填写产品名称和简称')
      return
    }
    const product = {
      ...newProduct,
      id: Date.now(),
      sections: []
    }
    setEditingProducts([...editingProducts, product])
    setShowAddProduct(false)
    setNewProduct({
      name: '',
      shortName: '',
      icon: '📦',
      color: '#4CAF50',
      sections: []
    })
    alert('✅ 产品添加成功！')
  }

  const updateProduct = (id, field, value) => {
    setEditingProducts(editingProducts.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ))
  }

  const deleteProduct = (id) => {
    if (!confirm('确定要删除这个产品吗？')) return
    setEditingProducts(editingProducts.filter(p => p.id !== id))
  }

  const addSection = () => {
    if (!editingProductId) return
    if (!newSection.title || !newSection.content) {
      alert('请填写章节标题和内容')
      return
    }
    const section = {
      title: newSection.title,
      content: newSection.content,
      keywords: newSection.keywords.split(',').map(k => k.trim()).filter(k => k)
    }
    setEditingProducts(editingProducts.map(p => 
      p.id === editingProductId 
        ? { ...p, sections: [...p.sections, section] }
        : p
    ))
    setNewSection({ title: '', content: '', keywords: '' })
    alert('✅ 章节添加成功！')
  }

  const updateSection = (productId, sectionIndex, field, value) => {
    setEditingProducts(editingProducts.map(p => 
      p.id === productId 
        ? { 
            ...p, 
            sections: p.sections.map((s, i) => 
              i === sectionIndex ? { ...s, [field]: value } : s
            )
          }
        : p
    ))
  }

  const deleteSection = (productId, sectionIndex) => {
    if (!confirm('确定要删除这个章节吗？')) return
    setEditingProducts(editingProducts.map(p => 
      p.id === productId 
        ? { ...p, sections: p.sections.filter((_, i) => i !== sectionIndex) }
        : p
    ))
  }

  const exportData = () => {
    const dataStr = JSON.stringify(editingProducts, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'products-data.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const importData = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result)
        setEditingProducts(data)
        alert('✅ 数据导入成功！')
      } catch (err) {
        alert('❌ 导入失败，请检查文件格式')
      }
    }
    reader.readAsText(file)
  }

  const renderDataEdit = () => (
    <div className="data-edit-mode">
      <div className="data-edit-header">
        <h2>✏️ 数据管理</h2>
        <p>编辑产品信息和内容</p>
      </div>

      {/* 操作按钮 */}
      <div className="action-buttons">
        <button className="btn btn-primary" onClick={saveProducts}>
          💾 保存数据
        </button>
        <button className="btn btn-secondary" onClick={loadProducts}>
          📥 加载数据
        </button>
        <button className="btn btn-secondary" onClick={exportData}>
          📤 导出数据
        </button>
        <label className="btn btn-secondary import-btn">
          📁 导入数据
          <input type="file" accept=".json" onChange={importData} hidden />
        </label>
      </div>

      {/* 添加产品 */}
      {showAddProduct ? (
        <div className="add-product-form">
          <h3>添加新产品</h3>
          <input
            type="text"
            placeholder="产品全称"
            value={newProduct.name}
            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
            className="form-input"
          />
          <input
            type="text"
            placeholder="产品简称"
            value={newProduct.shortName}
            onChange={(e) => setNewProduct({ ...newProduct, shortName: e.target.value })}
            className="form-input"
          />
          <input
            type="text"
            placeholder="图标 (如: 💊)"
            value={newProduct.icon}
            onChange={(e) => setNewProduct({ ...newProduct, icon: e.target.value })}
            className="form-input"
          />
          <input
            type="color"
            value={newProduct.color}
            onChange={(e) => setNewProduct({ ...newProduct, color: e.target.value })}
            className="form-input color-input"
          />
          <div className="form-actions">
            <button className="btn btn-primary" onClick={addProduct}>
              ✅ 添加
            </button>
            <button className="btn btn-secondary" onClick={() => setShowAddProduct(false)}>
              ❌ 取消
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary btn-full" onClick={() => setShowAddProduct(true)}>
          ➕ 添加产品
        </button>
      )}

      {/* 产品列表 */}
      <div className="products-list">
        {editingProducts.map(product => (
          <div key={product.id} className="product-edit-card" style={{ borderLeftColor: safeColor(product.color) }}>
            <div className="product-edit-header">
              <div className="product-edit-info">
                <span className="product-icon">{product.icon}</span>
                <div>
                  <input
                    type="text"
                    value={product.name}
                    onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                    className="edit-input product-name-input"
                  />
                  <input
                    type="text"
                    value={product.shortName}
                    onChange={(e) => updateProduct(product.id, 'shortName', e.target.value)}
                    className="edit-input product-short-input"
                  />
                </div>
              </div>
              <div className="product-edit-actions">
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => deleteProduct(product.id)}
                >
                  删除
                </button>
              </div>
            </div>

            {/* 添加章节 */}
            {editingProductId === product.id && (
              <div className="add-section-form">
                <input
                  type="text"
                  placeholder="章节标题"
                  value={newSection.title}
                  onChange={(e) => setNewSection({ ...newSection, title: e.target.value })}
                  className="form-input"
                />
                <textarea
                  placeholder="章节内容"
                  value={newSection.content}
                  onChange={(e) => setNewSection({ ...newSection, content: e.target.value })}
                  className="form-textarea"
                />
                <input
                  type="text"
                  placeholder="关键词（用逗号分隔）"
                  value={newSection.keywords}
                  onChange={(e) => setNewSection({ ...newSection, keywords: e.target.value })}
                  className="form-input"
                />
                <div className="form-actions">
                  <button className="btn btn-primary btn-sm" onClick={addSection}>
                    ✅ 添加章节
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditingProductId(null)}>
                    ❌ 取消
                  </button>
                </div>
              </div>
            )}

            {/* 章节列表 */}
            <div className="sections-list">
              {product.sections.map((section, index) => (
                <div key={index} className="section-edit-item">
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => updateSection(product.id, index, 'title', e.target.value)}
                    className="edit-input section-title-input"
                  />
                  <textarea
                    value={section.content}
                    onChange={(e) => updateSection(product.id, index, 'content', e.target.value)}
                    className="edit-textarea"
                  />
                  <input
                    type="text"
                    value={section.keywords.join(', ')}
                    onChange={(e) => updateSection(product.id, index, 'keywords', e.target.value.split(',').map(k => k.trim()).filter(k => k))}
                    className="edit-input section-keywords-input"
                  />
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => deleteSection(product.id, index)}
                  >
                    删除章节
                  </button>
                </div>
              ))}
            </div>

            {product.sections.length === 0 && (
              <p className="empty-hint">暂无章节，点击下方按钮添加</p>
            )}

            <button
              className="btn btn-secondary btn-full btn-sm"
              onClick={() => setEditingProductId(editingProductId === product.id ? null : product.id)}
            >
              {editingProductId === product.id ? '✖ 收起' : '➕ 添加章节'}
            </button>
          </div>
        ))}
      </div>

      <div className="data-tips">
        <h3>💡 使用提示</h3>
        <ul>
          <li>点击产品名称或内容即可编辑</li>
          <li>编辑后请点击"保存数据"按钮</li>
          <li>数据会保存到浏览器本地存储</li>
          <li>可以导出数据备份，或导入其他数据文件</li>
          <li>关键词用逗号分隔，方便搜索和语音朗读</li>
        </ul>
      </div>
    </div>
  )

  return (
    <div className="app">
      <header className="header">
        <h1>🐔 蛋鸡产品学习助手</h1>
        <p>驾驶友好 · 语音学习 · 高效记忆</p>
      </header>

      <div className="container">
        <div className="tab-bar">
          <div
            className={`tab-item ${currentTab === LearningMode.OVERVIEW ? 'active' : ''}`}
            onClick={() => setCurrentTab(LearningMode.OVERVIEW)}
          >
            <span className="tab-icon">📚</span>
            总览
          </div>
          <div
            className={`tab-item ${currentTab === LearningMode.CARD ? 'active' : ''}`}
            onClick={() => setCurrentTab(LearningMode.CARD)}
          >
            <span className="tab-icon">🎴</span>
            闪卡
          </div>
          <div
            className={`tab-item ${currentTab === LearningMode.LISTEN ? 'active' : ''}`}
            onClick={() => setCurrentTab(LearningMode.LISTEN)}
          >
            <span className="tab-icon">🔊</span>
            听学
          </div>
          <div
            className={`tab-item ${currentTab === LearningMode.QUIZ ? 'active' : ''}`}
            onClick={() => setCurrentTab(LearningMode.QUIZ)}
          >
            <span className="tab-icon">📝</span>
            测验
          </div>
          <div
            className={`tab-item ${currentTab === LearningMode.PROGRESS ? 'active' : ''}`}
            onClick={() => setCurrentTab(LearningMode.PROGRESS)}
          >
            <span className="tab-icon">📊</span>
            进度
          </div>
          <div
            className={`tab-item ${currentTab === LearningMode.DATA_EDIT ? 'active' : ''}`}
            onClick={() => setCurrentTab(LearningMode.DATA_EDIT)}
          >
            <span className="tab-icon">✏️</span>
            编辑
          </div>
        </div>

        {currentTab === LearningMode.OVERVIEW && renderOverview()}
        {currentTab === LearningMode.CARD && renderCard()}
        {currentTab === LearningMode.LISTEN && renderListen()}
        {currentTab === LearningMode.QUIZ && renderQuiz()}
        {currentTab === LearningMode.PROGRESS && renderProgress()}
        {currentTab === LearningMode.DATA_EDIT && renderDataEdit()}
      </div>

      {/* 底部快捷操作 */}
      {currentTab !== LearningMode.LISTEN && (
        <div className="quick-actions">
          <button
            className={`fab ${isPlaying ? 'playing' : ''}`}
            onClick={isPlaying ? stopSpeaking : speakProductContent}
          >
            {isPlaying ? '⏸' : '🔊'}
          </button>
        </div>
      )}
    </div>
  )
}

export default App
