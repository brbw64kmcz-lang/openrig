import Foundation

/// Reproduzierbarer Zufallsgenerator (SplitMix64).
/// Gleicher Startwert -> gleiche Simulation. Das ist wichtig, damit Nutzer
/// Ergebnisse vergleichen können und Tests stabil bleiben.
struct SeededGenerator: RandomNumberGenerator {
    private var state: UInt64

    init(seed: UInt64) {
        state = seed == 0 ? 0x9E37_79B9_7F4A_7C15 : seed
    }

    mutating func next() -> UInt64 {
        state &+= 0x9E37_79B9_7F4A_7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58_476D_1CE4_E5B9
        z = (z ^ (z >> 27)) &* 0x94D0_49BB_1331_11EB
        return z ^ (z >> 31)
    }

    /// Gleichverteilte Zahl in (0, 1]
    mutating func unit() -> Double {
        let v = Double(next() >> 11) / Double(1 << 53)
        return max(v, 1e-12)
    }

    /// Standardnormalverteilte Zahl (Box-Muller)
    mutating func normal() -> Double {
        let u1 = unit()
        let u2 = unit()
        return sqrt(-2 * log(u1)) * cos(2 * Double.pi * u2)
    }
}

/// Verteilungsfunktion der Standardnormalverteilung
func normalCDF(_ x: Double) -> Double {
    0.5 * (1 + erf(x / 2.0.squareRoot()))
}

func percentile(_ sorted: [Double], _ p: Double) -> Double {
    guard !sorted.isEmpty else { return 0 }
    let idx = min(sorted.count - 1, max(0, Int((Double(sorted.count - 1) * p).rounded())))
    return sorted[idx]
}
