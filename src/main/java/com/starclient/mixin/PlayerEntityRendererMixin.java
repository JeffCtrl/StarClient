package com.starclient.mixin;

import net.minecraft.client.network.AbstractClientPlayerEntity;
import net.minecraft.client.render.entity.PlayerEntityRenderer;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

@Mixin(PlayerEntityRenderer.class)
public class PlayerEntityRendererMixin {

    @Inject(method = "hasLabel(Lnet/minecraft/client/network/AbstractClientPlayerEntity;)Z", at = @At("HEAD"), cancellable = true)
    private void forceShowLocalNametag(AbstractClientPlayerEntity player, CallbackInfoReturnable<Boolean> cir) {
        // Force the nametag to render even for the local player client-side
        cir.setReturnValue(true);
    }
}