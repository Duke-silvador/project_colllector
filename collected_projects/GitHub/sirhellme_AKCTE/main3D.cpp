// Kepler-553 c - 3D Transit Simulation (SFML 3 + OpenGL fixed-function)
//
// Install (Arch):  sudo pacman -S sfml glu ttf-dejavu pkgconf
// Compile:
//   g++ -std=c++17 main.cpp -o kepler \
//       $(pkg-config --cflags --libs sfml-graphics sfml-window sfml-system gl glu)


#include <SFML/Graphics.hpp>
#include <SFML/OpenGL.hpp>
#include <GL/glu.h>

#include <algorithm>
#include <cmath>
#include <iomanip>
#include <iostream>
#include <optional>
#include <random>
#include <sstream>
#include <string>
#include <vector>

// Data dari analisis Python
constexpr double PI = 3.14159265358979323846;

constexpr double PERIOD_DAYS      = 328.23470;
constexpr double EPOCH_BKJD       = 199.22167045006876;
constexpr double DURATION_DAYS    = 0.42;
constexpr double DEPTH_PERCENT    = 0.6719488595745792;
constexpr double DEPTH            = DEPTH_PERCENT / 100.0;
constexpr double CADENCE_DAYS     = 0.0204339;

// Ukuran objek (proyeksi tampilan, bukan skala asli)
constexpr float STAR_R   = 1.5f;
constexpr float PLANET_R = 0.28f;
constexpr float ORBIT_R  = 8.0f;


// Struct
struct SimulationState {
    double simulationTimeDays = EPOCH_BKJD - PERIOD_DAYS / 2.0;
    double phase     = 0.0;
    double flux      = 1.0;
    double dtDays    = 0.0;
    bool   inTransit = false;
};

struct Camera {
    float yaw      = 0.6f;
    float pitch    = 0.35f;
    float distance = 22.0f;
    bool  observerMode = false;
};

struct StarPoint {
    float x, y, z, brightness;
};

struct UiState {
    bool   paused = false;
    bool   slowMo = true;
    double acceleration = 10.0;
};


// Fungsi sains
double calculatePhase(double timeDays) {
    double phase = std::fmod(timeDays - EPOCH_BKJD, PERIOD_DAYS) / PERIOD_DAYS;
    if (phase < 0.0) phase += 1.0;
    return phase;
}

// ubah fase 0..1 menjadi -0.5..+0.5
double centerPhase(double phase) {
    return (phase > 0.5) ? phase - 1.0 : phase;
}

bool isInTransit(double phase) {
    double durationPhase = DURATION_DAYS / PERIOD_DAYS;
    return std::abs(centerPhase(phase)) <= durationPhase / 2.0;
}

double calculateFlux(double phase) {
    return isInTransit(phase) ? 1.0 - DEPTH : 1.0;
}


// Helper UI 2D
std::string formatDouble(double value, int precision = 6) {
    std::ostringstream stream;
    stream << std::fixed << std::setprecision(precision) << value;
    return stream.str();
}

void drawText(sf::RenderTarget& target, const sf::Font& font, const std::string& str,
              float x, float y, unsigned int size, sf::Color color = sf::Color::White) {
    sf::Text text(font, str, size);
    text.setFillColor(color);
    text.setPosition(sf::Vector2f(x, y));
    target.draw(text);
}

void drawTextCentered(sf::RenderTarget& target, const sf::Font& font, const std::string& str,
                      float centerX, float y, unsigned int size, sf::Color color = sf::Color::White) {
    sf::Text text(font, str, size);
    text.setFillColor(color);
    float width = text.getLocalBounds().size.x;
    text.setPosition(sf::Vector2f(centerX - width / 2.0f, y));
    target.draw(text);
}

void drawPanel(sf::RenderTarget& target, float x, float y, float w, float h) {
    sf::RectangleShape panel(sf::Vector2f(w, h));
    panel.setPosition(sf::Vector2f(x, y));
    panel.setFillColor(sf::Color(10, 14, 28, 215));
    panel.setOutlineColor(sf::Color(60, 80, 130));
    panel.setOutlineThickness(1.0f);
    target.draw(panel);
}

// garis dengan ketebalan bebas
void drawLine(sf::RenderTarget& target, sf::Vector2f a, sf::Vector2f b,
              float thickness, sf::Color color) {
    sf::Vector2f d = b - a;
    float length = std::sqrt(d.x * d.x + d.y * d.y);

    sf::RectangleShape rect(sf::Vector2f(length, thickness));
    rect.setOrigin(sf::Vector2f(0.0f, thickness / 2.0f));
    rect.setPosition(a);
    rect.setRotation(sf::radians(std::atan2(d.y, d.x)));
    rect.setFillColor(color);
    target.draw(rect);
}

// Kurva cahaya: zoom +/- 1.5 hari di sekitar epoch
void drawLightCurve(sf::RenderTarget& target, const sf::Font& font,
                    float x, float y, float w, float h, const SimulationState& s) {
    drawPanel(target, x, y, w, h);
    drawText(target, font, "LIGHT CURVE (zoom +/- 1.5 days around transit)",
             x + 14, y + 10, 14, sf::Color(170, 190, 230));

    const float px = x + 60, py = y + 45, pw = w - 80, ph = h - 90;
    const double halfWindow = 1.5;
    const double fluxTop    = 1.0 + DEPTH * 0.6;
    const double fluxBottom = 1.0 - DEPTH * 1.6;

    auto toX = [&](double dt) {
        return px + static_cast<float>((dt + halfWindow) / (2.0 * halfWindow)) * pw;
    };
    auto toY = [&](double f) {
        return py + static_cast<float>((fluxTop - f) / (fluxTop - fluxBottom)) * ph;
    };

    // bingkai plot
    sf::RectangleShape frame(sf::Vector2f(pw, ph));
    frame.setPosition(sf::Vector2f(px, py));
    frame.setFillColor(sf::Color(5, 8, 16));
    frame.setOutlineColor(sf::Color(70, 80, 100));
    frame.setOutlineThickness(1.0f);
    target.draw(frame);

    // garis dasar flux = 1.0
    drawLine(target, {px, toY(1.0)}, {px + pw, toY(1.0)}, 1.0f, sf::Color(90, 90, 110));

    // kurva transit berbentuk kotak
    const double half = DURATION_DAYS / 2.0;
    const sf::Vector2f pts[6] = {
        {toX(-halfWindow), toY(1.0)},
        {toX(-half),       toY(1.0)},
        {toX(-half),       toY(1.0 - DEPTH)},
        {toX(half),        toY(1.0 - DEPTH)},
        {toX(half),        toY(1.0)},
        {toX(halfWindow),  toY(1.0)},
    };
    for (int i = 0; i < 5; ++i)
        drawLine(target, pts[i], pts[i + 1], 3.0f, sf::Color(255, 200, 90));

    // penanda posisi planet
    if (std::abs(s.dtDays) <= halfWindow) {
        float mx = toX(s.dtDays);
        drawLine(target, {mx, py}, {mx, py + ph}, 2.0f, sf::Color(120, 200, 255, 200));
        sf::CircleShape dot(5.0f);
        dot.setOrigin(sf::Vector2f(5.0f, 5.0f));
        dot.setPosition(sf::Vector2f(mx, toY(s.flux)));
        dot.setFillColor(sf::Color(120, 200, 255));
        target.draw(dot);
    } else {
        drawTextCentered(target, font, "planet is outside this window",
                         px + pw / 2.0f, py + ph / 2.0f - 8.0f, 13, sf::Color(130, 130, 150));
    }

    // label sumbu
    const sf::Color axis(150, 160, 180);
    drawText(target, font, "-1.5 d", px - 10, py + ph + 8, 12, axis);
    drawTextCentered(target, font, "mid-transit", px + pw / 2.0f, py + ph + 8, 12, axis);
    drawText(target, font, "+1.5 d", px + pw - 30, py + ph + 8, 12, axis);
    drawText(target, font, "1.0000", x + 8, toY(1.0) - 8, 12, axis);
    drawText(target, font, formatDouble(1.0 - DEPTH, 4), x + 8, toY(1.0 - DEPTH) - 8, 12,
             sf::Color(255, 200, 90));
}

// Seluruh UI 2D
void drawUI(sf::RenderTarget& target, const sf::Font& font, sf::Vector2u size,
            const SimulationState& s, const Camera& cam, const UiState& ui) {
    const float w = static_cast<float>(size.x);
    const float h = static_cast<float>(size.y);
    const sf::Color dim(150, 165, 200);
    const sf::Color accent(255, 200, 90);

    // Judul
    drawText(target, font, "KEPLER-553 c", 30, 20, 30);
    drawText(target, font, "3D Orbital Transit Simulation", 30, 58, 16, dim);

    // Badge status (tengah atas)
    sf::RectangleShape badge(sf::Vector2f(240.0f, 40.0f));
    badge.setOrigin(sf::Vector2f(120.0f, 0.0f));
    badge.setPosition(sf::Vector2f(w / 2.0f, 20.0f));
    badge.setFillColor(s.inTransit ? sf::Color(200, 70, 30, 230) : sf::Color(20, 60, 45, 220));
    badge.setOutlineColor(s.inTransit ? sf::Color(255, 160, 100) : sf::Color(70, 150, 110));
    badge.setOutlineThickness(1.0f);
    target.draw(badge);
    drawTextCentered(target, font, s.inTransit ? "TRANSIT" : "OUT OF TRANSIT", w / 2.0f, 29, 18);
    drawTextCentered(target, font,
                     cam.observerMode ? "VIEW: OBSERVER (from Earth)" : "VIEW: ORBIT (free camera)",
                     w / 2.0f, 68, 13, dim);

    // Panel kanan: parameter + data live
    const float rx = w - 350.0f, ry = 20.0f;
    drawPanel(target, rx, ry, 330.0f, 365.0f);

    auto row = [&](const std::string& label, const std::string& value, float yy) {
        drawText(target, font, label, rx + 16, yy, 14, dim);
        drawText(target, font, value, rx + 130, yy, 14);
    };

    drawText(target, font, "BLS PARAMETERS", rx + 16, ry + 14, 18, accent);
    row("Period",   formatDouble(PERIOD_DAYS, 4) + " d",   ry + 46);
    row("Epoch",    formatDouble(EPOCH_BKJD, 4) + " BKJD", ry + 72);
    row("Duration", formatDouble(DURATION_DAYS, 2) + " d", ry + 98);
    row("Depth",    formatDouble(DEPTH_PERCENT, 4) + " %", ry + 124);
    row("Cadence",  formatDouble(CADENCE_DAYS, 5) + " d",  ry + 150);

    drawText(target, font, "LIVE SIMULATION", rx + 16, ry + 184, 18, accent);
    double nextTransit = (1.0 - s.phase) * PERIOD_DAYS;
    row("Time",    formatDouble(s.simulationTimeDays, 3) + " BKJD", ry + 216);
    row("Phase",   formatDouble(s.phase, 5),                        ry + 242);
    row("Flux",    formatDouble(s.flux, 6),                         ry + 268);
    row("Next in", formatDouble(nextTransit, 2) + " d",             ry + 294);
    row("Speed",   formatDouble(ui.acceleration, 2) + " d/s",       ry + 320);

    // bar fase orbit
    sf::RectangleShape barBg(sf::Vector2f(298.0f, 8.0f));
    barBg.setPosition(sf::Vector2f(rx + 16, ry + 348));
    barBg.setFillColor(sf::Color(40, 50, 75));
    target.draw(barBg);
    sf::RectangleShape barFill(sf::Vector2f(298.0f * static_cast<float>(s.phase), 8.0f));
    barFill.setPosition(sf::Vector2f(rx + 16, ry + 348));
    barFill.setFillColor(accent);
    target.draw(barFill);

    // Panel kontrol (kiri bawah)
    const float cy = h - 225.0f;
    drawPanel(target, 20.0f, cy, 330.0f, 205.0f);
    drawText(target, font, "CONTROLS", 36, cy + 10, 16, accent);
    const std::string lines[] = {
        std::string("SPACE      ") + (ui.paused ? "Play" : "Pause"),
        "R          Reset",
        "UP/DOWN    Speed x2 / /2",
        "V          Switch Orbit / Observer",
        std::string("S          Slow-mo near transit: ") + (ui.slowMo ? "ON" : "OFF"),
        "J          Jump to next transit",
        "Mouse drag Rotate camera",
        "Wheel      Zoom",
    };
    for (int i = 0; i < 8; ++i)
        drawText(target, font, lines[i], 36, cy + 38 + i * 20.0f, 13, sf::Color(200, 210, 230));

    // Kurva cahaya (tengah bawah)
    drawLightCurve(target, font, (w - 560.0f) / 2.0f, h - 210.0f, 560.0f, 190.0f, s);
}

// Helper 3D (OpenGL)
void setupCamera(sf::Vector2u size, const Camera& cam) {
    glViewport(0, 0, static_cast<GLsizei>(size.x), static_cast<GLsizei>(size.y));

    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    double aspect = static_cast<double>(size.x) / std::max(1u, size.y);
    gluPerspective(cam.observerMode ? 30.0 : 45.0, aspect, 0.1, 1000.0);

    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();

    if (cam.observerMode) {
        // "Bumi" ada di sumbu +X, tepat di garis pandang transit (fase 0)
        gluLookAt(22.0, 0.0, 0.0,   0.0, 0.0, 0.0,   0.0, 1.0, 0.0);
    } else {
        float ex = cam.distance * std::cos(cam.pitch) * std::cos(cam.yaw);
        float ey = cam.distance * std::sin(cam.pitch);
        float ez = cam.distance * std::cos(cam.pitch) * std::sin(cam.yaw);
        gluLookAt(ex, ey, ez,   0.0, 0.0, 0.0,   0.0, 1.0, 0.0);
    }
}

void drawStarfield(const std::vector<StarPoint>& stars) {
    glDisable(GL_LIGHTING);
    glDisable(GL_BLEND);
    glPointSize(1.6f);
    glBegin(GL_POINTS);
    for (const auto& s : stars) {
        glColor3f(s.brightness, s.brightness, std::min(1.0f, s.brightness * 1.1f));
        glVertex3f(s.x, s.y, s.z);
    }
    glEnd();
}

void drawOrbitRing() {
    glDisable(GL_LIGHTING);
    glEnable(GL_BLEND);
    glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    glLineWidth(1.0f);
    glColor4f(0.5f, 0.6f, 0.85f, 0.35f);
    glBegin(GL_LINE_LOOP);
    for (int i = 0; i < 180; ++i) {
        float a = 2.0f * static_cast<float>(PI) * i / 180.0f;
        glVertex3f(ORBIT_R * std::cos(a), 0.0f, ORBIT_R * std::sin(a));
    }
    glEnd();

    // garis pandang ke Bumi (+X)
    glColor4f(1.0f, 0.65f, 0.2f, 0.35f);
    glBegin(GL_LINES);
    glVertex3f(STAR_R, 0.0f, 0.0f);
    glVertex3f(ORBIT_R + 8.0f, 0.0f, 0.0f);
    glEnd();
}

void drawPlanetTrail(double theta) {
    glDisable(GL_LIGHTING);
    glEnable(GL_BLEND);
    glBlendFunc(GL_SRC_ALPHA, GL_ONE);
    glLineWidth(2.0f);
    const int n = 80;
    const double length = 1.0; // radian
    glBegin(GL_LINE_STRIP);
    for (int i = 0; i <= n; ++i) {
        double a = theta - length + length * i / n;
        float alpha = static_cast<float>(i) / n;
        glColor4f(0.4f, 0.7f, 1.0f, alpha * 0.8f);
        glVertex3f(ORBIT_R * static_cast<float>(std::cos(a)), 0.0f,
                   ORBIT_R * static_cast<float>(std::sin(a)));
    }
    glEnd();
}

void drawPlanet(GLUquadric* quad, double theta) {
    float px = ORBIT_R * static_cast<float>(std::cos(theta));
    float pz = ORBIT_R * static_cast<float>(std::sin(theta));

    // cahaya datang dari bintang di titik (0,0,0)
    glEnable(GL_LIGHTING);
    glEnable(GL_LIGHT0);
    glDisable(GL_BLEND);

    glPushMatrix();
    glTranslatef(px, 0.0f, pz);
    glColor3f(0.35f, 0.6f, 1.0f);
    gluSphere(quad, PLANET_R, 40, 40);
    glPopMatrix();
}

void drawStar(GLUquadric* quad) {
    // inti bintang: terang, tidak terkena lighting
    glDisable(GL_LIGHTING);
    glDisable(GL_BLEND);
    glColor3f(1.0f, 0.88f, 0.5f);
    gluSphere(quad, STAR_R, 64, 64);

    // halo/glow: bola transparan berlapis, dicampur secara additive
    glEnable(GL_BLEND);
    glBlendFunc(GL_SRC_ALPHA, GL_ONE);
    glDepthMask(GL_FALSE);
    const float scales[3] = {1.12f, 1.35f, 1.75f};
    const float alphas[3] = {0.14f, 0.07f, 0.035f};
    for (int i = 0; i < 3; ++i) {
        glColor4f(1.0f, 0.78f, 0.3f, alphas[i]);
        gluSphere(quad, STAR_R * scales[i], 40, 40);
    }
    glDepthMask(GL_TRUE);
}

void renderScene(sf::Vector2u size, GLUquadric* quad,
                 const std::vector<StarPoint>& stars,
                 const Camera& cam, const SimulationState& s) {
    glEnable(GL_DEPTH_TEST);
    glDepthMask(GL_TRUE);
    glDisable(GL_BLEND);
    glDisable(GL_LIGHTING);
    glClearColor(0.01f, 0.01f, 0.03f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

    setupCamera(size, cam);

    // pengaturan cahaya (harus SETELAH kamera supaya posisinya benar)
    GLfloat lightPos[]     = {0.0f, 0.0f, 0.0f, 1.0f};
    GLfloat lightDiffuse[] = {1.0f, 0.95f, 0.8f, 1.0f};
    GLfloat ambient[]      = {0.04f, 0.04f, 0.06f, 1.0f};
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);
    glLightfv(GL_LIGHT0, GL_DIFFUSE, lightDiffuse);
    glLightModelfv(GL_LIGHT_MODEL_AMBIENT, ambient);
    glEnable(GL_COLOR_MATERIAL);
    glColorMaterial(GL_FRONT_AND_BACK, GL_AMBIENT_AND_DIFFUSE);

    double theta = s.phase * 2.0 * PI;

    drawStarfield(stars);
    drawOrbitRing();
    drawPlanetTrail(theta);
    drawPlanet(quad, theta);
    drawStar(quad);   // terakhir, karena ada halo transparan
}

// Cari font yang ada di sistem
bool loadAnyFont(sf::Font& font) {
    const char* candidates[] = {
        "/usr/share/fonts/TTF/DejaVuSans.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/TTF/LiberationSans-Regular.ttf",
        "/usr/share/fonts/noto/NotoSans-Regular.ttf",
        "/usr/share/fonts/gnu-free/FreeSans.ttf",
    };
    for (const char* path : candidates) {
        if (font.openFromFile(path)) {
            std::cout << "Font: " << path << "\n";
            return true;
        }
    }
    return false;
}

// Main
int main() {
    // Window dengan depth buffer (wajib untuk 3D).
    // Jika window gagal dibuat di XWayland, ubah antiAliasingLevel menjadi 0.
    sf::ContextSettings settings;
    settings.depthBits = 24;
    settings.antiAliasingLevel = 4;
    settings.majorVersion = 2;   // kode ini memakai fixed-function pipeline
    settings.minorVersion = 1;

    sf::RenderWindow window(sf::VideoMode(sf::Vector2u(1280, 720)),
                            "Kepler-553 c - 3D Transit Simulation",
                            sf::Style::Default, sf::State::Windowed, settings);
    window.setFramerateLimit(60);

    const sf::ContextSettings actual = window.getSettings();
    std::cout << "OpenGL " << actual.majorVersion << "." << actual.minorVersion
              << ", depth " << actual.depthBits
              << ", AA " << actual.antiAliasingLevel << "\n";

    sf::Font font;
    if (!loadAnyFont(font)) {
        std::cerr << "Gagal memuat font. Pasang dengan: sudo pacman -S ttf-dejavu\n";
        return 1;
    }

    // Quadric = objek bantu GLU untuk menggambar bola
    GLUquadric* quad = gluNewQuadric();
    gluQuadricNormals(quad, GLU_SMOOTH);

    // Bintang latar: titik acak di permukaan bola raksasa
    std::vector<StarPoint> stars;
    {
        std::mt19937 rng(553);
        std::normal_distribution<float> gauss(0.0f, 1.0f);
        std::uniform_real_distribution<float> bright(0.25f, 1.0f);
        for (int i = 0; i < 2000; ++i) {
            float x = gauss(rng), y = gauss(rng), z = gauss(rng);
            float len = std::sqrt(x * x + y * y + z * z);
            if (len < 0.0001f) continue;
            const float R = 300.0f;
            stars.push_back({x / len * R, y / len * R, z / len * R, bright(rng)});
        }
    }

    sf::Clock clock;
    SimulationState state;
    Camera cam;
    UiState ui;
    sf::Vector2i lastMouse(0, 0);
    bool glErrorReported = false;

    while (window.isOpen()) {
        // Event 
        while (const std::optional event = window.pollEvent()) {
            if (event->is<sf::Event::Closed>()) {
                window.close();
            }
            else if (const auto* resized = event->getIf<sf::Event::Resized>()) {
                // supaya UI 2D tidak melar saat window diubah ukurannya
                window.setView(sf::View(sf::FloatRect(sf::Vector2f(0.0f, 0.0f),
                                                      sf::Vector2f(resized->size))));
            }
            else if (const auto* key = event->getIf<sf::Event::KeyPressed>()) {
                switch (key->scancode) {
                    case sf::Keyboard::Scancode::Escape:
                        window.close(); break;
                    case sf::Keyboard::Scancode::Space:
                        ui.paused = !ui.paused; break;
                    case sf::Keyboard::Scancode::R:
                        state.simulationTimeDays = EPOCH_BKJD - PERIOD_DAYS / 2.0; break;
                    case sf::Keyboard::Scancode::Up:
                        ui.acceleration = std::min(ui.acceleration * 2.0, 5000.0); break;
                    case sf::Keyboard::Scancode::Down:
                        ui.acceleration = std::max(ui.acceleration / 2.0, 0.01); break;
                    case sf::Keyboard::Scancode::V:
                        cam.observerMode = !cam.observerMode; break;
                    case sf::Keyboard::Scancode::S:
                        ui.slowMo = !ui.slowMo; break;
                    case sf::Keyboard::Scancode::J: {
                        // loncat ke 2.5 hari sebelum transit berikutnya
                        double k = std::ceil((state.simulationTimeDays - EPOCH_BKJD) / PERIOD_DAYS);
                        state.simulationTimeDays = EPOCH_BKJD + k * PERIOD_DAYS - 2.5;
                        break;
                    }
                    default: break;
                }
            }
            else if (const auto* wheel = event->getIf<sf::Event::MouseWheelScrolled>()) {
                cam.distance -= wheel->delta * 1.5f;
                cam.distance = std::clamp(cam.distance, 5.0f, 80.0f);
            }
            else if (const auto* moved = event->getIf<sf::Event::MouseMoved>()) {
                if (sf::Mouse::isButtonPressed(sf::Mouse::Button::Left) && !cam.observerMode) {
                    sf::Vector2i d = moved->position - lastMouse;
                    cam.yaw   += d.x * 0.006f;
                    cam.pitch += d.y * 0.006f;
                    cam.pitch = std::clamp(cam.pitch, -1.5f, 1.5f);
                }
                lastMouse = moved->position;
            }
        }

        // Update
        float dt = std::min(clock.restart().asSeconds(), 0.1f);

        double speed = ui.acceleration;
        // slow-mo otomatis saat dekat transit supaya transit sempat terlihat
        if (ui.slowMo && std::abs(state.dtDays) < 2.0)
            speed = std::min(speed, 0.15);

        if (!ui.paused)
            state.simulationTimeDays += dt * speed;

        state.phase     = calculatePhase(state.simulationTimeDays);
        state.flux      = calculateFlux(state.phase);
        state.inTransit = isInTransit(state.phase);
        state.dtDays    = centerPhase(state.phase) * PERIOD_DAYS;

        // Draw
        if (!window.setActive(true)) {
            std::cerr << "Gagal mengaktifkan konteks OpenGL.\n";
            return 1;
        }

        // 1) Scene 3D
        renderScene(window.getSize(), quad, stars, cam, state);

        if (!glErrorReported) {
            GLenum err = glGetError();
            if (err != GL_NO_ERROR) {
                std::cerr << "GL error: 0x" << std::hex << err << std::dec << "\n";
                glErrorReported = true;
            }
        }

        // kembalikan state yang diubah scene 3D sebelum menggambar UI
        glDisable(GL_LIGHTING);
        glDisable(GL_COLOR_MATERIAL);
        glDisable(GL_DEPTH_TEST);
        glDisable(GL_BLEND);
        glDepthMask(GL_TRUE);

        // 2) UI 2D di atas scene
        window.pushGLStates();
        drawUI(window, font, window.getSize(), state, cam, ui);
        window.popGLStates();

        window.display();
    }

    gluDeleteQuadric(quad);
    return 0;
}