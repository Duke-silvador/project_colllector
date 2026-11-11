public class MentoriaEnVivo extends Curso {
    String enlaceVideollamada;
    int cupoMaximo;
    int alumnoInscriptos;

    public MentoriaEnVivo(String nombreCurso, int horasTotales, double precioBase, String enlaceVideollamada, int cupoMaximo) {
        super(nombreCurso, horasTotales, precioBase);
        this.enlaceVideollamada = enlaceVideollamada;
        this.cupoMaximo = cupoMaximo;
        this.alumnoInscriptos = 0;
    }

    @Override
    public void inscribirAlumno(String alumno) {
        if (alumnoInscriptos < cupoMaximo) {
            System.out.println(alumno + " fue inscripto a la mentoria ");
        } else {
            System.out.println("no hay cupos disponibles");
        }
    }
}
