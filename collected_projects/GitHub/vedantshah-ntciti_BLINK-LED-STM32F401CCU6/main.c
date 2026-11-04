#include <stdint.h>

#define REG32(addr) (*(volatile uint32_t *)addr)

//determine mode of pin 
//but toggling 27 and 26 bits and 13 bits
#define GPIOC_MODER REG32(0x40020800)

//RCC AHB1 peripheral clock enable register (RCC_AHB1ENR) , set bit 2 to on
#define RCC_AHB1ENR REG32(0x40023830)

//for setting and reseting led, by setting 13 and 29 bit
#define GPIOC_BSRR REG32(0x40020818)

void delay(volatile uint32_t count)
{
    while ( count-- )
    {
        //tell the cpu to do nothing for some time 
        //__asm means inline assembly code in c 
        __asm volatile ("nop");
    }
}


int main(void)
{
    //turning on the rcc
    RCC_AHB1ENR |= (1UL << 2);

    //initializing gpio to io
    //clear 26 and 27 bits
    GPIOC_MODER &= ~(3UL << 26);
    //set 26 to 1
    GPIOC_MODER |= (1UL << 26);

    while (1) 
    {
        //led low as active low
        GPIOC_BSRR = (1UL << 13);
        delay(4000000);

        //led high as active high
        GPIOC_BSRR = (1UL << 29);
        delay(10000000);
    }
}
