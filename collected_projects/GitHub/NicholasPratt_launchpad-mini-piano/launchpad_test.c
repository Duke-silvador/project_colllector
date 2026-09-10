#include "midi_backend.h"

#include <stdint.h>
#include <stdio.h>
#include <string.h>

static int message_count;

static void midi_input(uint8_t status, uint8_t data1, uint8_t data2,
                       void *context) {
    (void)context;
    printf("Received MIDI: %02X %02X %02X\n", status, data1, data2);
    ++message_count;
    fflush(stdout);
}

static void set_grid(MidiBackend *midi, uint8_t color) {
    int row;
    int column;
    for (row = 0; row < 8; ++row)
        for (column = 0; column < 8; ++column)
            midi_backend_send_launchpad(midi, 0x90,
                                        (uint8_t)(row * 16 + column), color);
}

int main(int argc, char **argv) {
    const char *device_filter = "Launchpad Mini";
    MidiBackend *midi = NULL;
    char error[512];
    int tenth;

    if (argc == 3 && strcmp(argv[1], "--device") == 0)
        device_filter = argv[2];
    else if (argc != 1) {
        fprintf(stderr, "Usage: %s [--device NAME]\n", argv[0]);
        return 2;
    }
    if (!midi_backend_open(&midi, device_filter, device_filter, NULL, midi_input, NULL,
                           error, sizeof(error))) {
        fprintf(stderr, "%s\n", error);
        return 1;
    }

    printf("Lighting the 8x8 grid green. Press any pad within 15 seconds...\n");
    fflush(stdout);
    set_grid(midi, 60);
    for (tenth = 0; tenth < 150 && message_count == 0; ++tenth)
        midi_backend_poll(midi, 100);
    if (message_count == 0)
        printf("No pad press was received.\n");
    else
        printf("Input test passed (%d MIDI message%s received).\n",
               message_count, message_count == 1 ? "" : "s");
    set_grid(midi, 0);
    midi_backend_close(midi);
    return message_count == 0 ? 3 : 0;
}
