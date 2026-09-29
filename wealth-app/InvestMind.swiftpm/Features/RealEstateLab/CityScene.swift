import SceneKit
import SwiftUI

/// Baut aus dem Stadtmodell eine 3D-Szene.
/// Höhe der Gebäude = Typ × Preisniveau, Farbe = Typ oder (Heatmap) Preis.
final class CityScene {
    let scene = SCNScene()
    let cameraNode = SCNNode()
    private let cityNode = SCNNode()

    init() {
        let n = Float(CityModel.size)
        scene.background.contents = UIColor(Theme.bgTop)

        // Boden
        let groundSize: CGFloat = CGFloat(n) + 1.0
        let ground = SCNBox(width: groundSize, height: 0.2, length: groundSize, chamferRadius: 0.2)
        ground.firstMaterial?.diffuse.contents = UIColor(red: 0.10, green: 0.13, blue: 0.28, alpha: 1)
        let groundNode = SCNNode(geometry: ground)
        let center: Float = n / 2.0 - 0.5
        groundNode.position = SCNVector3(center, Float(-0.1), center)
        scene.rootNode.addChildNode(groundNode)
        scene.rootNode.addChildNode(cityNode)

        // Kamera schräg von oben
        let camera = SCNCamera()
        camera.fieldOfView = 45
        camera.zFar = 200
        cameraNode.camera = camera
        let camXZ: Float = n / 2.0 + 6.5
        cameraNode.position = SCNVector3(camXZ, Float(9), camXZ)
        cameraNode.look(at: SCNVector3(center, Float(0), center))
        scene.rootNode.addChildNode(cameraNode)

        // Licht
        let ambient = SCNNode()
        ambient.light = SCNLight()
        ambient.light?.type = .ambient
        ambient.light?.intensity = 450
        ambient.light?.color = UIColor(red: 0.75, green: 0.75, blue: 1.0, alpha: 1)
        scene.rootNode.addChildNode(ambient)

        let sun = SCNNode()
        sun.light = SCNLight()
        sun.light?.type = .directional
        sun.light?.intensity = 900
        sun.light?.castsShadow = true
        let tilt: Float = -Float.pi / 3.0
        let turn: Float = Float.pi / 4.0
        sun.eulerAngles = SCNVector3(tilt, turn, Float(0))
        scene.rootNode.addChildNode(sun)
    }

    func update(model: CityModel, heatmap: Bool, selected: Int?, owned: Int?) {
        cityNode.childNodes.forEach { $0.removeFromParentNode() }
        let prices = model.cells.filter { $0.building.isRentable }.map(\.pricePerSqm)
        let minP = prices.min() ?? CityModel.basePrice
        let maxP = max(prices.max() ?? CityModel.basePrice, minP + 1)

        for cell in model.cells {
            let (x, y) = model.coords(cell.id)
            let b = cell.building
            let relative: Double = cell.pricePerSqm / CityModel.basePrice
            let priceFactor: Double = b.isRentable ? min(max(relative, 0.5), 2.5) : 1.0
            let height: CGFloat = CGFloat(b.baseHeight * priceFactor)
            let fx: Float = Float(x)
            let fy: Float = Float(y)
            let halfHeight: Float = Float(height) / 2.0
            let footprint: CGFloat = b == .empty ? 0.92 : 0.78
            let box = SCNBox(width: footprint, height: max(height, 0.02), length: footprint, chamferRadius: 0.04)
            let material = SCNMaterial()
            material.diffuse.contents = UIColor(color(for: cell, heatmap: heatmap, minP: minP, maxP: maxP))
            material.roughness.contents = 0.6
            if cell.id == selected {
                material.emission.contents = UIColor(Theme.lavender.opacity(0.5))
            }
            box.materials = [material]
            let node = SCNNode(geometry: box)
            node.position = SCNVector3(fx, halfHeight, fy)
            cityNode.addChildNode(node)

            if b == .park {
                let x1: Float = fx - 0.15
                let z1: Float = fy - 0.1
                let x2: Float = fx + 0.2
                let z2: Float = fy + 0.15
                addTree(at: SCNVector3(x1, Float(0), z1))
                addTree(at: SCNVector3(x2, Float(0), z2))
            }
            if cell.id == owned {
                let marker = SCNNode(geometry: SCNSphere(radius: 0.14))
                marker.geometry?.firstMaterial?.diffuse.contents = UIColor(Theme.positive)
                marker.geometry?.firstMaterial?.emission.contents = UIColor(Theme.positive.opacity(0.6))
                let markerY: Float = Float(height) + 0.35
                marker.position = SCNVector3(fx, markerY, fy)
                cityNode.addChildNode(marker)
            }
        }
    }

    private func addTree(at p: SCNVector3) {
        let cone = SCNCone(topRadius: 0, bottomRadius: 0.16, height: 0.45)
        cone.firstMaterial?.diffuse.contents = UIColor(red: 0.25, green: 0.65, blue: 0.45, alpha: 1)
        let node = SCNNode(geometry: cone)
        node.position = SCNVector3(p.x, Float(0.3), p.z)
        cityNode.addChildNode(node)
    }

    private func color(for cell: CityCell, heatmap: Bool, minP: Double, maxP: Double) -> Color {
        guard heatmap, cell.building.isRentable else { return cell.building.color }
        let t: Double = (cell.pricePerSqm - minP) / (maxP - minP)
        // Von Blau (günstig) über Lila zu Weiß (teuer)
        let r: Double = 0.3 + 0.7 * t
        let g: Double = 0.35 + 0.55 * t * t
        return Color(red: r, green: g, blue: 1.0)
    }
}
