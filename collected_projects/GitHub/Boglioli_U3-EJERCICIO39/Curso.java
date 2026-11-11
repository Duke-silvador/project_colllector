import javax.lang.model.element.NestingKind;

public class Curso {
    String nombreCurso;
    int horasTotales;
    double precioBase;
    public Curso(String nombreCurso, int horasTotales, double precioBase) {
        this.nombreCurso = nombreCurso;
        this.horasTotales = horasTotales;
        this.precioBase = precioBase;
    }
    public double calcularCostoFinal(double descuento) {
       return precioBase - (precioBase * descuento / 100);
    }
    public void inscribirAlumno(String alumno) {
        System.out.println(alumno + " inscripto al curso " + nombreCurso);
    }
}
