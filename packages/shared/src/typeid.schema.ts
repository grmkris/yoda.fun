import { fromString, getType, TypeID, toUUID, typeid } from "typeid-js";
import { z } from "zod";

const typeIdLength = 26;

export const idTypesMapNameToPrefix = {
  user: "usr",
  session: "ses",
  account: "acc",
  verification: "ver",

  // ai related
  aiGeneration: "aig",
} as const;

type IdTypesMapNameToPrefix = typeof idTypesMapNameToPrefix;

type IdTypesMapPrefixToName = {
  [K in keyof IdTypesMapNameToPrefix as IdTypesMapNameToPrefix[K]]: K;
};

const idTypesMapPrefixToName = Object.fromEntries(
  Object.entries(idTypesMapNameToPrefix).map(([x, y]) => [y, x])
) as IdTypesMapPrefixToName;

export type IdTypePrefixNames = keyof typeof idTypesMapNameToPrefix;

export type TypeId<T extends IdTypePrefixNames> =
  `${(typeof idTypesMapNameToPrefix)[T]}_${string}`;

export const typeIdValidator = <const T extends IdTypePrefixNames>(prefix: T) =>
  z
    .string()
    .startsWith(`${idTypesMapNameToPrefix[prefix]}_`)
    .length(typeIdLength + idTypesMapNameToPrefix[prefix].length + 1) // suffix length + prefix length + underscore
    .refine(
      (input) => {
        try {
          TypeID.fromString(input).asType(idTypesMapNameToPrefix[prefix]);
          return true;
        } catch {
          return false;
        }
      },
      {
        message: `Invalid ${prefix} TypeID format`,
      }
    ) as z.ZodType<TypeId<T>, TypeId<T>>;

export const typeIdGenerator = <const T extends IdTypePrefixNames>(prefix: T) =>
  typeid(idTypesMapNameToPrefix[prefix]).toString() as TypeId<T>;

export const typeIdFromUuid = <const T extends IdTypePrefixNames>(
  prefix: T,
  uuid: string
) => {
  const actualPrefix = idTypesMapNameToPrefix[prefix];
  return TypeID.fromUUID(actualPrefix, uuid).toString() as TypeId<T>;
};

export const typeIdToUuid = <const T extends IdTypePrefixNames>(
  input: TypeId<T>
) => {
  const id = fromString(input);
  return {
    uuid: toUUID(id).toString(),
    prefix: getType(id),
  };
};

export const validateTypeId = <const T extends IdTypePrefixNames>(
  prefix: T,
  data: unknown
): data is TypeId<T> => typeIdValidator(prefix).safeParse(data).success;

export const inferTypeId = <T extends keyof IdTypesMapPrefixToName>(
  input: `${T}_${string}`
) =>
  idTypesMapPrefixToName[
    TypeID.fromString(input).getType() as T
  ] as unknown as T;

// Exported validators and types
export const UserId = typeIdValidator("user");
export type UserId = z.infer<typeof UserId>;

export const SessionId = typeIdValidator("session");
export type SessionId = z.infer<typeof SessionId>;

export const AccountId = typeIdValidator("account");
export type AccountId = z.infer<typeof AccountId>;

export const VerificationId = typeIdValidator("verification");
export type VerificationId = z.infer<typeof VerificationId>;
