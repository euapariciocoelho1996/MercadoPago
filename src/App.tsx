import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

interface PaymentResult {
  status: 'idle' | 'processing' | 'success' | 'error' | 'pending'
  message: string
  paymentId?: string
  statusDetail?: string
}

function App() {
  const [amount, setAmount] = useState('')
  const [payerEmail, setPayerEmail] = useState('')
  const [paymentResult, setPaymentResult] = useState<PaymentResult>({
    status: 'idle',
    message: ''
  })

  // Token de acesso do Mercado Pago (em produção, isso deve estar no backend)
  const ACCESS_TOKEN = 'APP_USR-7033358834430014-122219-ffbed878f808ea3d36b3b22107dca7ff-3087494349'

  // Verifica os parâmetros de retorno do Mercado Pago quando a página carrega
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const status = urlParams.get('status')
    const paymentId = urlParams.get('payment_id')

    if (status && paymentId) {
      // Remove os parâmetros da URL para limpar
      window.history.replaceState({}, document.title, window.location.pathname)

      if (status === 'approved') {
        setPaymentResult({
          status: 'success',
          message: '✅ Pagamento AUTORIZADO com sucesso!',
          paymentId: paymentId,
          statusDetail: status
        })
      } else if (status === 'pending') {
        setPaymentResult({
          status: 'pending',
          message: '⏳ Pagamento PENDENTE de aprovação.',
          paymentId: paymentId,
          statusDetail: status
        })
      } else {
        setPaymentResult({
          status: 'error',
          message: '❌ Pagamento NÃO AUTORIZADO.',
          paymentId: paymentId,
          statusDetail: status
        })
      }
    }
  }, [])

  const handlePayment = async () => {
    // Validações
    if (!amount || Number(amount) <= 0) {
      setPaymentResult({
        status: 'error',
        message: 'Informe um valor válido para pagamento.'
      })
      return
    }

    if (!payerEmail || !payerEmail.includes('@')) {
      setPaymentResult({
        status: 'error',
        message: 'Informe um email válido.'
      })
      return
    }

    // Inicializa o estado de processamento
    setPaymentResult({
      status: 'processing',
      message: 'Criando preferência de pagamento...'
    })

    try {
      // Get current URL for back_urls - garante URL completa e válida
      let currentUrl = window.location.href.split('?')[0] // Remove query params se houver
      
      // Se for localhost, usa uma URL de teste válida ou remove auto_return
      // O Mercado Pago pode não aceitar localhost em alguns casos
      const isLocalhost = currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1')
      
      // Valida se a URL é válida
      if (!currentUrl || !currentUrl.startsWith('http')) {
        throw new Error('URL inválida para retorno do pagamento')
      }

      // Create the preference request object
      const body: any = {
        items: [
          {
            id: 'item_001',
            title: 'Produto',
            description: 'Pagamento de teste',
            quantity: 1,
            currency_id: 'BRL',
            unit_price: Number(amount),
          },
        ],
        payer: {
          email: payerEmail,
        },
        back_urls: {
          success: currentUrl,
          failure: currentUrl,
          pending: currentUrl,
        },
        external_reference: `ext_ref_${Date.now()}`,
      }

      // Só adiciona auto_return se não for localhost
      // O Mercado Pago pode rejeitar auto_return com URLs locais
      if (!isLocalhost) {
        body.auto_return = 'approved'
      }

      // Create the preference using REST API
      const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Erro da API Mercado Pago:', errorData)
        
        // Tenta extrair mensagem de erro mais detalhada
        let errorMessage = errorData.message || `Erro HTTP: ${response.status}`
        if (errorData.cause && Array.isArray(errorData.cause)) {
          const causes = errorData.cause.map((c: any) => c.description || c.message).join(', ')
          if (causes) errorMessage += ` - ${causes}`
        }
        
        throw new Error(errorMessage)
      }

      const data = await response.json()

      // Redirect to Mercado Pago checkout
      if (data.init_point) {
        window.location.href = data.init_point
      } else if (data.sandbox_init_point) {
        // Usa sandbox_init_point se init_point não estiver disponível
        window.location.href = data.sandbox_init_point
      } else {
        throw new Error('URL de checkout não encontrada na resposta')
      }
    } catch (error: any) {
      console.error('Erro ao criar preferência de pagamento:', error)
      
      let errorMessage = 'Erro ao criar preferência de pagamento.'
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.cause?.message) {
        errorMessage = error.cause.message
      }

      setPaymentResult({
        status: 'error',
        message: `❌ ${errorMessage}`
      })
    }
  }

  const resetForm = () => {
    setAmount('')
    setPayerEmail('')
    setPaymentResult({
      status: 'idle',
      message: ''
    })
  }

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>

      <h1>Sistema de Pagamento - Mercado Pago</h1>

      <div className="card">
        <h2>Processar Pagamento</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px', margin: '0 auto' }}>
        <input
          type="number"
          placeholder="Valor em R$"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
            style={{ padding: '10px', fontSize: '16px' }}
            disabled={paymentResult.status === 'processing'}
          />

          <input
            type="email"
            placeholder="Email do pagador"
            value={payerEmail}
            onChange={(e) => setPayerEmail(e.target.value)}
            style={{ padding: '10px', fontSize: '16px' }}
            disabled={paymentResult.status === 'processing'}
          />

          <button 
            onClick={handlePayment}
            disabled={paymentResult.status === 'processing'}
            style={{ 
              padding: '12px', 
              fontSize: '16px', 
              backgroundColor: paymentResult.status === 'processing' ? '#ccc' : '#009ee3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: paymentResult.status === 'processing' ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {paymentResult.status === 'processing' ? 'Redirecionando...' : 'Pagar com Mercado Pago'}
          </button>

          {paymentResult.status !== 'idle' && (
            <div 
              style={{ 
                padding: '16px', 
                marginTop: '16px',
                borderRadius: '8px',
                backgroundColor: paymentResult.status === 'success' 
                  ? '#d4edda' 
                  : paymentResult.status === 'error' 
                  ? '#f8d7da' 
                  : paymentResult.status === 'pending'
                  ? '#fff3cd'
                  : '#d1ecf1',
                color: paymentResult.status === 'success' 
                  ? '#155724' 
                  : paymentResult.status === 'error' 
                  ? '#721c24' 
                  : paymentResult.status === 'pending'
                  ? '#856404'
                  : '#0c5460',
                border: `1px solid ${paymentResult.status === 'success' 
                  ? '#c3e6cb' 
                  : paymentResult.status === 'error' 
                  ? '#f5c6cb' 
                  : paymentResult.status === 'pending'
                  ? '#ffeaa7'
                  : '#bee5eb'}`,
                fontWeight: 'bold',
                fontSize: '16px'
              }}
            >
              <div>{paymentResult.message}</div>
              {paymentResult.paymentId && (
                <div style={{ marginTop: '8px', fontSize: '14px', fontWeight: 'normal' }}>
                  ID do Pagamento: {paymentResult.paymentId}
                </div>
              )}
              {paymentResult.statusDetail && (
                <div style={{ marginTop: '4px', fontSize: '14px', fontWeight: 'normal' }}>
                  Status: {paymentResult.statusDetail}
                </div>
              )}
            </div>
          )}

          {(paymentResult.status === 'success' || paymentResult.status === 'error' || paymentResult.status === 'pending') && (
            <button 
              onClick={resetForm}
              style={{ 
                padding: '10px', 
                fontSize: '14px', 
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '8px'
              }}
            >
              Novo Pagamento
        </button>
          )}
        </div>
      </div>

      <p className="read-the-docs">
        Sistema de pagamento integrado com Mercado Pago
      </p>
    </>
  )
}

export default App
