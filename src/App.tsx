import { GridCanvas } from './components/Grid/GridCanvas'
import { ResourceDisplay } from './components/UI/ResourceDisplay'
import { BuildingMenu } from './components/UI/BuildingMenu'

function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto p-4">
        <header className="mb-6">
          <h1 className="text-4xl font-bold">The Unknown</h1>
          <p className="text-gray-400">Incremental Resource Discovery Game</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
          {/* Main grid area */}
          <div>
            <GridCanvas />
          </div>

          {/* Sidebar */}
          <div className="lg:w-80 space-y-4">
            <BuildingMenu />
            <ResourceDisplay />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
