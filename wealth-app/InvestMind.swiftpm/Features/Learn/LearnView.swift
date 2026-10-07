import SwiftUI

/// Lernbereich: persönlicher Lernpfad nach Zielen, Werten und Interessen.
struct LearnView: View {
    @EnvironmentObject private var app: AppState

    var body: some View {
        Screen(title: "Lernen", subtitle: "Schritt für Schritt – passend zu deinen Zielen.", badge: .learning) {
            Card(title: "Dein Fortschritt", icon: "chart.bar.fill") {
                HStack {
                    ProgressBar(value: app.totalLearningProgress, height: 10)
                    Text(Fmt.pct(app.totalLearningProgress, digits: 0)).font(.headline).foregroundStyle(Theme.textPrimary)
                }
                Text("\(app.completedLessons.count) Lektionen abgeschlossen")
                    .font(.caption).foregroundStyle(Theme.textSecondary)
            }

            Text("Für dich empfohlen").font(.title3.bold()).foregroundStyle(Theme.textPrimary)
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 300), spacing: 12)], spacing: 12) {
                ForEach(app.recommendedCourses) { course in
                    NavigationLink(value: course) {
                        CourseCard(course: course)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

struct CourseCard: View {
    @EnvironmentObject private var app: AppState
    let course: Course

    var body: some View {
        let progress = app.progress(of: course)
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 12) {
                IconBubble(systemName: course.icon, color: progress >= 1 ? Theme.positive : Theme.purple, size: 42)
                VStack(alignment: .leading, spacing: 2) {
                    Text(course.area.rawValue.uppercased()).font(.caption2.bold()).foregroundStyle(Theme.lavender)
                    Text(course.title).font(.headline).foregroundStyle(Theme.textPrimary)
                        .multilineTextAlignment(.leading)
                }
            }
            Text(course.subtitle).font(.caption).foregroundStyle(Theme.textSecondary)
            if let reason = app.recommendationReason(for: course) {
                Label(reason, systemImage: course.id == "crypto-code" ? "lock.open.fill" : "sparkles")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(course.id == "crypto-code" ? Theme.warning : Theme.sky)
            }
            HStack {
                ProgressBar(value: progress, height: 6)
                Text("\(course.lessons.count) Lektionen").font(.caption2).foregroundStyle(Theme.textTertiary)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: Theme.corner).fill(Theme.card))
        .overlay(RoundedRectangle(cornerRadius: Theme.corner).stroke(Theme.cardBorder))
    }
}

struct CourseView: View {
    @EnvironmentObject private var app: AppState
    let course: Course

    var body: some View {
        Screen(title: course.title, subtitle: course.subtitle, badge: .learning) {
            ForEach(Array(course.lessons.enumerated()), id: \.element.id) { idx, lesson in
                NavigationLink {
                    LessonView(course: course, index: idx)
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: app.isCompleted(lesson) ? "checkmark.circle.fill" : "\(idx + 1).circle")
                            .font(.title2)
                            .foregroundStyle(app.isCompleted(lesson) ? Theme.positive : Theme.lavender)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(lesson.title).font(.headline).foregroundStyle(Theme.textPrimary)
                            Text("\(lesson.minutes) Min.\(lesson.quiz != nil ? " · Quiz" : "")\(lesson.code != nil ? " · Code" : "")")
                                .font(.caption).foregroundStyle(Theme.textSecondary)
                        }
                        Spacer()
                        Image(systemName: "chevron.right").foregroundStyle(Theme.textTertiary)
                    }
                    .padding(14)
                    .background(RoundedRectangle(cornerRadius: 14).fill(Theme.card))
                }
                .buttonStyle(.plain)
            }
        }
    }
}

/// Eine Lektion: Text, optional Code, optional Quiz, Link zum Ausprobieren.
struct LessonView: View {
    @EnvironmentObject private var app: AppState
    @Environment(\.dismiss) private var dismiss
    let course: Course
    let index: Int
    @State private var answer: Int?

    private var lesson: Lesson { course.lessons[index] }

    var body: some View {
        Screen(title: lesson.title, subtitle: "\(course.title) · Lektion \(index + 1)/\(course.lessons.count)", badge: .learning) {
            ProgressBar(value: Double(index + 1) / Double(course.lessons.count))
            Card {
                ForEach(lesson.paragraphs, id: \.self) { p in
                    Text(p).font(.body).foregroundStyle(Theme.textPrimary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            if let code = lesson.code {
                Card(title: "Code", icon: "chevron.left.forwardslash.chevron.right", trailing: "Swift") {
                    ScrollView(.horizontal) {
                        Text(code)
                            .font(.system(.callout, design: .monospaced))
                            .foregroundStyle(Theme.lavender)
                            .textSelection(.enabled)
                    }
                }
            }
            if let quiz = lesson.quiz {
                quizCard(quiz)
            }
            if let section = lesson.tryIt {
                Button {
                    app.open(section)
                } label: {
                    Label("Jetzt ausprobieren: \(section.title)", systemImage: section.icon)
                }
                .buttonStyle(SecondaryButtonStyle())
            }
            Button {
                app.complete(lesson)
                dismiss()
            } label: {
                Label(app.isCompleted(lesson) ? "Erledigt – zurück" : "Lektion abschließen", systemImage: "checkmark")
            }
            .buttonStyle(PrimaryButtonStyle())
            .disabled(lesson.quiz != nil && answer != lesson.quiz?.correctIndex && !app.isCompleted(lesson))
        }
    }

    private func quizCard(_ quiz: QuizQuestion) -> some View {
        Card(title: "Welche Aussage ist korrekt?", icon: "questionmark.circle.fill") {
            Text(quiz.question).font(.headline).foregroundStyle(Theme.textPrimary)
            ForEach(Array(quiz.options.enumerated()), id: \.offset) { idx, option in
                Button {
                    withAnimation { answer = idx }
                } label: {
                    HStack {
                        Image(systemName: symbol(idx, quiz))
                            .foregroundStyle(color(idx, quiz))
                        Text(option).foregroundStyle(Theme.textPrimary).multilineTextAlignment(.leading)
                        Spacer()
                    }
                    .padding(12)
                    .background(RoundedRectangle(cornerRadius: 12).fill(answer == idx ? Theme.cardRaised : Theme.card.opacity(0.5)))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(answer == idx ? color(idx, quiz) : Theme.cardBorder))
                }
                .buttonStyle(.plain)
            }
            if let a = answer {
                Text(a == quiz.correctIndex ? "Richtig! " + quiz.explanation : "Noch nicht ganz. Versuch es nochmal.")
                    .font(.callout)
                    .foregroundStyle(a == quiz.correctIndex ? Theme.positive : Theme.warning)
            }
        }
    }

    private func symbol(_ idx: Int, _ quiz: QuizQuestion) -> String {
        guard answer == idx else { return "circle" }
        return idx == quiz.correctIndex ? "checkmark.circle.fill" : "xmark.circle.fill"
    }

    private func color(_ idx: Int, _ quiz: QuizQuestion) -> Color {
        guard answer == idx else { return Theme.textTertiary }
        return idx == quiz.correctIndex ? Theme.positive : Theme.negative
    }
}
