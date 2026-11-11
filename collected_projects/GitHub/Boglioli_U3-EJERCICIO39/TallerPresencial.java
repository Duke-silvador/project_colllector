public class TallerPresencial extends Curso {
    int numeroAula;
    String direccion;

    public TallerPresencial(String nombreCurso, int horasTotales, double precioBase, int numeroAula, String direccion) {
        super(nombreCurso, horasTotales, precioBase);
        this.numeroAula = numeroAula;
        this.direccion = direccion;
    }

    @Override
    public void inscribirAlumno(String alumno) {
        System.out.println(alumno + " fue inscripto al taller presencial " + nombreCurso);
    }
}