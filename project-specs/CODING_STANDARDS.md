Backend Rules

Java version: 21

Architecture

Controller → Service → Repository

DTO Pattern

Entities must not be returned directly.

Mapping

Use MapStruct.

Validation

Use Hibernate Validator.

Response Format

{
  success: true,
  data: {},
  message: ""
}

Naming Convention

UserController
UserService
UserRepository
UserMapper
UserDto