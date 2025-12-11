package com.panda_bobba.spring_bobba.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class MemberChargeDTO {

    @NotBlank(message = "El nombre del miembro es obligatorio")
    @Size(max = 100, message = "El nombre del miembro no puede superar 100 caracteres")
    private String memberName;

    @NotBlank(message = "El nombre del cargo es obligatorio")
    @Size(max = 100, message = "El nombre del cargo no puede superar 100 caracteres")
    private String chargeName;

    @NotBlank(message = "La descripción es obligatoria")
    @Size(max = 255, message = "La descripción no puede superar 255 caracteres")
    private String descripcion;

    public MemberChargeDTO() {
    }

    public MemberChargeDTO(String memberName, String chargeName, String descripcion) {
        this.memberName = memberName;
        this.chargeName = chargeName;
        this.descripcion = descripcion;
    }

    public String getMemberName() {
        return memberName;
    }

    public void setMemberName(String memberName) {
        this.memberName = memberName;
    }

    public String getChargeName() {
        return chargeName;
    }

    public void setChargeName(String chargeName) {
        this.chargeName = chargeName;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    @Override
    public String toString() {
        return "MemberChargeDTO [memberName=" + memberName + ", chargeName=" + chargeName + ", descripcion="
                + descripcion + "]";
    }
}
