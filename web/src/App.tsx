import { Layout } from 'antd'
import './App.css'
import { AppHeader } from './components/AppHeader.tsx'
import { AlertLogPage } from './pages/alert-log/AlertLogPage.tsx'

const { Content } = Layout

function App() {
  return (
    <Layout className="app-shell">
      <AppHeader />
      <Content className="app-content">
        <AlertLogPage />
      </Content>
    </Layout>
  )
}

export default App
