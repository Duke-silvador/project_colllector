#include <SFML/Graphics.hpp>
#include <cmath>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>

// Kepler-553 c 
// Parameters obtained from Python analysis:
// Period: 328.234706 days
// Epoch: 199.22167045006876 BKJD
// Duration: 0.42 days
// Depth of transit: 0.6719488595745792 ± 5.207778011306965 %
// Cadence: 0.0204339 days
// Cadence minutes: 29.42 minutes
// BLS Power: 0.008330456729352

// constants
constexpr double PI = 3.1415926535897932384626;

// BLS parameters
constexpr double PERIOD_DAYS = 328.234706; // days
constexpr double EPOCH_BKJD = 199.22167045006876;   // BKJD
constexpr double DURATION_DAYS = 0.42; // days
constexpr double DEPTH_PERCENT = 0.6719488595745792;   // %

constexpr double DEPTH = DEPTH_PERCENT / 100.0; 

constexpr double CADENCE_DAYS = 0.0204339; //days

// Simulation parameters
// Not actually the physical raidus of the planet 
constexpr float STAR_RADIUS = 90.0f;
constexpr float PLANET_RADIUS = 18.0f;
constexpr float ORBIT_RADIUS = 260.0f;

// Data structure
struct SimulationState {
    double simulationTimeDays;
    double phase;
    double flux;
    bool inTransit;
};

// Calculate orbital phase and flux
double calculatePhase(double timeDays) {
    double phase = 
    std::fmod(timeDays - EPOCH_BKJD, PERIOD_DAYS) / PERIOD_DAYS;

    if (phase < 0.0) 
        phase += 1.0;

    return phase;
}

double calculateFlux(double phase) {
    double centeredPhase = phase;

    if (centeredPhase > 0.5) 
        centeredPhase -= 1.0;
    
    double durationPhase = 
        DURATION_DAYS / PERIOD_DAYS;

    if (std::abs(centeredPhase) <= durationPhase / 2.0) {
        return 1.0 - DEPTH;
    }

    return 1.0;
}

// Check Transit
bool isInTransit(double phase) {
    double centeredPhase = phase;

    if (centeredPhase > 0.5)
        centeredPhase -= 1.0;

    double durationPhase = DURATION_DAYS / PERIOD_DAYS;

    return std::abs(centeredPhase) 
            <= durationPhase / 2.0;
}

// draw text
void drawText(
    sf::RenderWindow& window,
    const sf::Font& font,
    const std::string& text,
    float x, float y,
    unsigned int size 
)
{
    sf::Text t(
        font,
        text,
        size
    );

    t.setFillColor(sf::Color::White);

    t.setPosition(sf::Vector2f(x, y));
    window.draw(t);
}

// Format num
std::string formatDouble(
    double value,
    int precision = 6
)
{
    std::ostringstream stream;
    stream 
        << std::fixed
        << std::setprecision(precision)
        << value;

    return stream.str();
}

// stars
void drawStar(
    sf::RenderWindow& window,
    float x,
    float y
)
{
    sf::CircleShape star(STAR_RADIUS);

    star.setOrigin(sf::Vector2f(STAR_RADIUS, STAR_RADIUS));
    star.setPosition(sf::Vector2f(x, y));
    star.setFillColor(sf::Color(255, 220, 120));
    star.setOutlineColor(sf::Color(255, 245, 100));
    star.setOutlineThickness(3.0f);
    window.draw(star);
}

// orbit
void drawOrbit(
    sf::RenderWindow& window,
    float x,
    float y
)
{
    sf::CircleShape orbit(ORBIT_RADIUS);

    orbit.setOrigin(sf::Vector2f(ORBIT_RADIUS, ORBIT_RADIUS));
    orbit.setPosition(sf::Vector2f(x, y));
    orbit.setFillColor(sf::Color::Transparent);
    orbit.setOutlineColor(sf::Color(100, 100, 100));
    orbit.setOutlineThickness(1.0f);
    window.draw(orbit);
}

// planet
void drawPlanet(
    sf::RenderWindow& window,
    float x,
    float y
)
{
    sf::CircleShape planet(PLANET_RADIUS);
    planet.setOrigin(sf::Vector2f(PLANET_RADIUS, PLANET_RADIUS));
    planet.setPosition(sf::Vector2(x, y));
    planet.setFillColor(sf::Color::White);
    window.draw(planet);
}

// light curve
void drawLightCurve(
    sf::RenderWindow& window,
    float x,
    float y,
    float width,
    float height,
    double phase
)
{
    sf::RectangleShape background;

    background.setSize(sf::Vector2f(width, height));

    background.setPosition(sf::Vector2f(x, y));
    background.setFillColor(sf::Color(15, 15, 15));
    background.setOutlineColor(sf::Color(80, 80, 80));
    background.setOutlineThickness(1.0f);
    window.draw(background);

    sf::VertexArray baseLine(
        sf::PrimitiveType::Lines,
        2
    );

    baseLine[0].position = sf::Vector2f(
        x,
        y + height * 0.25f
    );

    baseLine[0].color = sf::Color(100, 100, 100);

    baseLine[1].position = sf::Vector2f(
        x + width,
        y + height * 0.25f
    );

    baseLine[1].color = sf::Color(100,100,100);

    window.draw(baseLine);

    const int points = 500;

    sf::VertexArray curve(sf::PrimitiveType::LineStrip, points);

    for (int i = 0; i < points; ++i) {
        double p = static_cast<double>(i) / (points - 1);
        double centeredPhase = p;
        if (centeredPhase > 0.5)
            centeredPhase -= 1.0;
        
        double durationPhase = DURATION_DAYS / PERIOD_DAYS;

        double flux = 1.0;
        if (std::abs(centeredPhase) <= durationPhase / 2.0) {
            flux = 1.0 - DEPTH;
        }
        float px = x + static_cast<float>(p * width);
        float py = y + height * 0.25f + static_cast<float>((1.0 - flux) * height * 20.0f);

        curve[i].position = 
            sf::Vector2f(px, py);

        curve[i].color = 
            sf::Color::White;
    }
    window.draw(curve);

    // current phase marker
    float markerX = x + static_cast<float> (
        phase * width
    );
    sf::RectangleShape marker;

    marker.setSize(
        sf::Vector2f(2.0f, height)
    );

    marker.setPosition(
        sf::Vector2f(
            markerX,
            y
        )
    );

    marker.setFillColor(
        sf::Color(200, 200, 200)
    );

    window.draw(marker);
}

int main() {
    // window
    sf::RenderWindow window(
        sf::VideoMode(sf::Vector2u(1920, 1080)),
        "Kepler-553 c - 2D Transit Simulation"
    );

    window.setFramerateLimit(60);

    // Font
    sf::Font font;

    if (!font.openFromFile(
        "/usr/share/fonts/TTF/DejaVuSans.ttf"
    ))
    {
        std::cerr << "Failed to load a font.\n";
        return 1;
    }

    // Clock
    sf::Clock clock;

    // Simulation
    SimulationState state;

    state.simulationTimeDays = 
        EPOCH_BKJD - PERIOD_DAYS / 2.0;

    state.phase = 0.0;
    state.flux = 1.0;
    state.inTransit = false;

    // Real Time Acceleration
    double timeAcceleration = 10.0;
    bool paused = false;

    // Main loop
    while (window.isOpen()){
        // Event
        while (const std::optional event = window.pollEvent()){
            if (event->is<sf::Event::Closed>()){
                window.close();
            }

            // Space == pause/play
            if (
                const auto* keyPressed = 
                    event->getIf<sf::Event::KeyPressed>()
            ){
                if (
                    keyPressed->scancode ==sf::Keyboard::Scancode::Space
                ){
                    paused = !paused;
                }

                // R == reset
                if (
                    keyPressed->scancode == sf::Keyboard::Scancode::R
                ){
                    state.simulationTimeDays = EPOCH_BKJD - PERIOD_DAYS / 2.0;
                }

                // arrUp == faster
                if (
                    keyPressed -> scancode == sf::Keyboard::Scancode::Up
                ){
                    timeAcceleration *= 2;
                }

                // arrDown == slower
                if (
                    keyPressed->scancode == sf::Keyboard::Scancode::Down
                ){
                    timeAcceleration /= 2.0;

                    if (timeAcceleration < 0.1) timeAcceleration = 0.1;
                }
            }
        }        

        // Update Simulation
        float deltaSeconds = clock.restart().asSeconds();

        if (!paused){
            state.simulationTimeDays += deltaSeconds 
            * timeAcceleration;
        }

        // Calc Phase
        state.phase = calculatePhase(
            state.simulationTimeDays
        );

        // Calc Flux
        state.flux = calculateFlux(
            state.phase
        );

        // Transit status
        state.inTransit = isInTransit(
            state.phase
        );

        // draw
        window.clear(
            sf::Color(5, 5, 8)
        );

        // Title
        drawText(
            window,
            font,
            "KEPLER-553 c",
            40,
            25,
            28
        );

        drawText(
            window,
            font,
            "2D Orbital Transit Simulation",
            40,
            60,
            16
        );

        // System
        const float starX = 390.0f;
        const float starY = 310.0;

        drawOrbit(window, starX, starY);
        drawStar(window, starX, starY);

        // Planet position
        // x = r cos(theta)
        // y = r sin(theta)
        double theta = state.phase * 2.0 * PI;

        float planetX = starX + ORBIT_RADIUS * static_cast<float>(std::cos(theta));

        float planetY = starY + ORBIT_RADIUS * static_cast<float>(std::sin(theta));

        drawPlanet(window, planetX, planetY);

        // status
        drawText(
            window,
            font,
            state.inTransit
                ? "TRANSIT"
                : "ORBIT",
            280,
            575,
            22
        );

        // LightCurve
        drawLightCurve(
            window, 690, 100, 530, 250, state.phase
        );

        // Parameters
        drawText(
            window, font, "BLS PARAMETERS", 690, 380, 20
        );

        drawText(
            window, font, "PERIOD : " + formatDouble(
                PERIOD_DAYS, 6
            )
            + " days",
            690,
            415,
            16
        );

        drawText(
            window, font, "Epoch : " + formatDouble(
                EPOCH_BKJD,
                6
            )
            + " BKJD",
            690,
            445,
            16
        );

        drawText(
            window, font, "Duration : " + formatDouble(
                DURATION_DAYS,
                6
            )
            + " days",
            690,
            475,
            16
        );

        drawText(
            window, font, "Depth: " + formatDouble(
                DEPTH_PERCENT,
                6
            )
            + " %",
            690,
            505,
            16
        );

        // Real time simulation
        drawText(
            window, font, "Simulation time : " + formatDouble(
                state.simulationTimeDays,
                4
            )
            + " BKJD",
            690,
            550,
            16
        );

        drawText(
            window, font, "Phase : " + formatDouble(
                state.phase,
                5
            ),
            690,
            580,
            16
        );

        drawText(
            window, font, "Flux : " + formatDouble(
                state.flux,
                8
            ),
            690,
            610,
            16
        );

        // controls
        drawText(
            window, font, 
            "SPACE: Pause/Play         "
            "R: Reset       "
            "UP/DOWN: Speed",
            40,
            665,
            15
        );

        drawText(
            window, font, "Acceleration" + formatDouble(
                timeAcceleration,
                2
            )
            + " days/ sec",
            40,
            625,
            17
        );

        // Display
        window.display();
    }

    return 0;
}


// how to run the code
//
// g++ main.cpp -o main $(pkg-config --cflag --libs sfml-graphics sfml-window sfml-system)
// ./main 