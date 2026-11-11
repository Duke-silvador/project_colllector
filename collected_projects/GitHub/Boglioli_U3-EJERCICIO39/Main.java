public class Main {
    public static void main(String[] args) {
        CursoGrabado grabado = new CursoGrabado("java", 40, 20000, "udemy" , "2024-12-31", true);
        MentoriaEnVivo mentoria = new MentoriaEnVivo("programacion", 20, 15000, "https://zoom.us/j/123456789", 5);
        TallerPresencial taller = new TallerPresencial("base de datos", 30, 25000, 101, "Calle Falsa 123");
        grabado.inscribirAlumno("Juan");
        mentoria.inscribirAlumno("Maria");
        mentoria.inscribirAlumno("Pedro");
        mentoria.inscribirAlumno("Ana");
        taller.inscribirAlumno("Luis");
        System.out.println();
        System.out.println("costo final del curso grabado: $" + grabado.calcularCostoFinal(10));
        System.out.println("costo final de la mentoria en vivo: $" + mentoria.calcularCostoFinal(15));
        System.out.println("costo final del taller presencial: $" + taller.calcularCostoFinal(20));
    }
}
