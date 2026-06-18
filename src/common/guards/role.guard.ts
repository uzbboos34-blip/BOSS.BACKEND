import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

@Injectable()
export class RoleGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const roles = this.reflector.get<string[]>('roles', context.getHandler())

        if (!roles) {
            return true
        }

        const req = context.switchToHttp().getRequest()
        if(!roles.includes(req["user"].role)){
            throw new ForbiddenException("У вас нет доступа")
        }
        return true
    }
}