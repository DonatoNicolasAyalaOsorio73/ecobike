
import ControladorRegistro from './ControladorRegistro';

describe('Pruebas unitarias para ControladorRegistro', () => {
  it('debería encontrar al amigo que desea agregar', () => {
    const controlador = new ControladorRegistro();
    const usuario = 'usuario1'; // Nombre de usuario válido
    const amigo = 'amigo1'; // Amigo a agregar
    const resultado = controlador.Validacion(usuario, amigo);

    expect(resultado).toEqual(amigo); // Verifica que el resultado sea el amigo que deseas agregar
  });

  it('debería recibir un mensaje de confirmación al agregar un nuevo amigo', () => {
    const controlador = new ControladorRegistro();
    const usuario = 'usuario1'; // Nombre de usuario válido
    const amigo = 'amigo1'; // Amigo a agregar
    const resultado = controlador.aceptacionAmistad(usuario, amigo);

    expect(resultado).toEqual('Nuevo amigo agregado con éxito'); // Verifica que se reciba el mensaje de confirmación adecuado
  });
});
