import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { ILike, Repository } from 'typeorm';
import { UserRole } from './user.enum';
import { validateUser } from 'src/helpers/user.helper';
import { Cart } from 'src/cart/cart.entity';
import { AuthService } from 'src/auth/auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { nowAsDate } from 'src/helpers/date.helper';

@Injectable()
export class UserService {
  protected logger = new Logger('UserService');

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Cart)
    private readonly cartService: Repository<Cart>,
    private readonly authService: AuthService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { email, password, nombre, apellido, direccion, telefono, rol } =
      createUserDto;

    validateUser(email, password, nombre, apellido);

    const existingUser = await this.userRepository.findOne({
      where: { email: ILike(email) },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await this.authService.hashPassword(password);

    const user = this.userRepository.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      nombre,
      apellido,
      direccion,
      telefono,
      rol: rol || UserRole.CLIENTE_MINORISTA,
    });

    const savedUser = await this.userRepository.save(user);

    // Create cart for the user
    await this.cartService.save({
      userId: savedUser.id,
      createdAt: nowAsDate(),
    });

    const { password: _, ...userWithoutPassword } = savedUser;
    return userWithoutPassword;
  }

  async findAll() {
    const users = await this.userRepository.find({
      relations: ['descuentosAplicados'],
    });
    return users.map(({ password, ...user }) => user);
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['descuentosAplicados'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findByEmail(email: string) {
    const user = await this.userRepository.findOne({
      where: { email: ILike(email) },
      relations: ['descuentosAplicados'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);

    if (updateUserDto.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: ILike(updateUserDto.email) },
      });

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email already in use');
      }
    }

    if (updateUserDto.password) {
      updateUserDto.password = await this.authService.hashPassword(
        updateUserDto.password,
      );
    }

    await this.userRepository.update(id, updateUserDto);
    return this.findOne(id);
  }

  async remove(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.userRepository.remove(user);
    return { message: 'User deleted successfully' };
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim();
    this.logger.log(`Login attempt for email: ${normalizedEmail}`);

    const user = await this.userRepository.findOne({
      where: { email: ILike(normalizedEmail) },
    });

    if (!user) {
      this.logger.warn(`User not found: ${normalizedEmail}`);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    this.logger.log(`User found: ${user.email}, comparing password...`);
    const isPasswordValid = await this.authService.comparePassword(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      this.logger.warn(`Invalid password for user: ${normalizedEmail}`);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    this.logger.log(`Login successful for user: ${user.email}`);

    const token = await this.authService.generateToken({
      id: user.id,
      email: user.email,
      rol: user.rol,
    });

    const { password: _, ...userWithoutPassword } = user;

    return {
      token,
      user: userWithoutPassword,
    };
  }
}
