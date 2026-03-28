import { useState } from 'react'
import { login } from '../../lib/plannerApi'

function LoginGate({ onAuthenticated }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const payload = await login({ username, password })
      onAuthenticated(payload.user)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="login-gate">
      <div className="login-copy">
        <span className="hero-kicker">Acesso restrito</span>
        <h1>Entre para abrir o hub de respostas.</h1>
        <p>
          Essa area agora exige autenticacao antes de carregar as mensagens vindas dos formularios.
        </p>
      </div>

      <form className="login-card" onSubmit={handleSubmit}>
        <label className="responses-field">
          <span>Usuario</span>
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Seu usuario"
            disabled={isSubmitting}
          />
        </label>

        <label className="responses-field">
          <span>Senha</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Sua senha"
            disabled={isSubmitting}
          />
        </label>

        {errorMessage ? (
          <div className="feedback-banner" role="alert">
            {errorMessage}
          </div>
        ) : null}

        <button type="submit" className="hero-button is-primary login-submit" disabled={isSubmitting}>
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </section>
  )
}

export default LoginGate
