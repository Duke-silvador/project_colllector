public class CursoGrabado extends Curso {
    String plataforma;
    String fechaLimite;
    boolean tieneConexion;
    public CursoGrabado(String nombreCurso, int horasTotales, double precioBase, String plataforma, String fechaLimite, boolean tieneConexion) {
        super(nombreCurso, horasTotales, precioBase);
        this.plataforma = plataforma;
        this.fechaLimite = fechaLimite;
        this.tieneConexion = tieneConexion;
    }
    @Override
    public void inscribirAlumno(String alumno) {
        if (tieneConexion) {
            System.out.println(alumno + " inscripto al curso grabado " + nombreCurso + " en la plataforma " + plataforma);
        } else {
            System.out.println("No se puede inscribir a " + alumno + " al curso grabado " + nombreCurso + " porque no tiene conexión a internet.");
        }
    }
}
